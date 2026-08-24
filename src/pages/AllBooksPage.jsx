/**
 * @file The `/books` route — the main shelf, and the only place the app's two
 * data sources are merged.
 *
 * This is the most involved component in the codebase. It:
 *
 * 1. Queries Supabase (the user's own books), Open Library (the catalogue), and
 *    the `favorites` table — all three concurrently.
 * 2. Normalizes both book sources into one shape.
 * 3. Paints the bookmark flag onto whichever books are favorited.
 * 4. Renders the result, and hosts the details and edit modals.
 *
 * With no search term it browses (Supabase books + Open Library trending); with
 * one it searches both sources by title.
 *
 * Three patterns here are load-bearing and easy to break — read them before
 * editing:
 *
 * - **`reloadToken` drives the fetch, not the query.** The query lives in a ref,
 *   so re-running the *same* search still refetches. A `[query]` dependency
 *   would skip that.
 * - **`fetchBooks` and its helpers sit at module scope and never call setState.**
 *   The `react-hooks/set-state-in-effect` lint rule rejects setState reachable
 *   from an effect, including through a component-scope helper. State is set in
 *   the effect's `.then()` instead.
 *   `AbortError` is swallowed everywhere — it means "superseded", not "failed".
 * - **Callbacks passed to BookCard are wrapped in useCallback.** BookCard is
 *   memoized; an unstable prop would silently defeat that across 48+ cards.
 *
 * @see ARCHITECTURE.md §5 for the full request lifecycle.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import supabase from "../utils/config";
import { getTrending, searchBooks } from "../utils/openLibrary";
import { bookKey, fromOpenLibrary, fromSupabase } from "../utils/normalizeBook";
import BookCard from "../components/BookCard";
import DetailsBook from "../components/DetailsBook";
import UpdateBook from "../components/UpdateBook";
import "../styles/pages/AllBooksPage.css";

// Coalesces the Enter key and the Search button firing back to back, which
// matters against Open Library's 1 request/second limit.
const SEARCH_DEBOUNCE_MS = 400;

/**
 * Unwraps the Supabase `books` result from `Promise.allSettled`.
 *
 * Two failure modes have to be handled, because supabase-js resolves query
 * errors into `{ data, error }` rather than rejecting the promise. Only a
 * network-level failure actually rejects.
 *
 * @param {PromiseSettledResult} settled - The settled `books` query.
 * @returns {object[]|null} Normalized books, or null if the source is unusable —
 *   which the caller turns into a "your library is unavailable" notice rather
 *   than an empty shelf.
 */
const readOwned = (settled) => {
  if (settled.status === "rejected") {
    console.log(settled.reason);
    return null;
  }
  if (settled.value.error) {
    console.log(settled.value.error);
    return null;
  }
  return (settled.value.data ?? []).map(fromSupabase);
};

/**
 * Builds lookup sets from the `favorites` table.
 *
 * Bookmarks are keyed two different ways — `ol_key` for catalogue books,
 * `book_id` for the user's own — so deciding the flag on a merged shelf needs
 * both. Sets keep the subsequent paint O(n) rather than O(n*m).
 *
 * @param {object[]|null|undefined} rows - Rows of `{ ol_key, book_id }`.
 * @returns {{keys: Set<string>, ids: Set<number>}}
 */
const favoriteIndex = (rows) => ({
  keys: new Set((rows ?? []).map((row) => row.ol_key).filter(Boolean)),
  ids: new Set(
    (rows ?? []).map((row) => row.book_id).filter((id) => id !== null),
  ),
});

/**
 * Stamps the `favorite` flag onto each book by looking it up in the index.
 *
 * Whether a book is bookmarked is *not* stored on the book — it lives in a
 * separate table — so it is applied here, at the last moment before render.
 * Returns new objects rather than mutating, so React sees a changed reference.
 *
 * @param {object[]} books - Normalized books from either source.
 * @param {{keys: Set<string>, ids: Set<number>}} index - From `favoriteIndex`.
 * @returns {object[]} The same books with `favorite` set correctly.
 */
const paintFavorites = (books, { keys, ids }) =>
  books.map((book) => ({
    ...book,
    favorite:
      book.source === "openlibrary" ? keys.has(book.id) : ids.has(book.id),
  }));

/**
 * Unwraps the Open Library result from `Promise.allSettled`.
 *
 * @param {PromiseSettledResult} settled - The settled trending/search request.
 * @returns {object[]|null} Normalized books, or null if Open Library is
 *   unreachable — the caller degrades to showing the user's own books.
 * @throws {DOMException} Re-throws an AbortError so the caller can distinguish
 *   "the user superseded this request" from "the source is down". Swallowing it
 *   here would render a stale result as if it were current.
 */
const readCatalog = (settled) => {
  if (settled.status === "rejected") {
    // An abort is the caller cancelling, not the source failing.
    if (settled.reason?.name === "AbortError") {
      throw settled.reason;
    }
    console.log(settled.reason);
    return null;
  }
  return settled.value.map(fromOpenLibrary);
};

/**
 * Fetches every source and merges them into the finished shelf.
 *
 * Steps:
 * 1. Fire three requests concurrently — the user's books, the catalogue, and the
 *    bookmark list. An empty query means "browse" (all books + trending); a
 *    non-empty one means "search" (title match on both sources).
 * 2. Unwrap each independently. `allSettled` rather than `all` is the point: the
 *    sources are unrelated, so one being down should degrade the shelf, not
 *    blank it. Only *both* failing is a hard error.
 * 3. Paint bookmark flags on, then concatenate — the user's own books first, so
 *    their shelf stays at the top.
 *
 * Deliberately contains no setState, so an effect can call it without tripping
 * `react-hooks/set-state-in-effect`.
 *
 * @param {string} query - The search term; empty string means browse.
 * @param {AbortSignal} signal - Cancels the Open Library leg when superseded.
 * @returns {Promise<{books: object[], warning: string|null}>} `warning` is set
 *   when exactly one source failed, for display above the shelf.
 * @throws {Error} When both sources are unreachable.
 * @throws {DOMException} AbortError when superseded by a newer request.
 */
const fetchBooks = async (query, signal) => {
  const trimmed = query.trim();
  const ownedQuery = supabase
    .from("books")
    .select()
    .order("id", { ascending: false });

  // allSettled, not all: the sources are independent, so one being down should
  // degrade the shelf rather than empty it.
  const settled = await Promise.allSettled([
    trimmed === ""
      ? ownedQuery.limit(200)
      : ownedQuery.ilike("title", `%${trimmed}%`),
    trimmed === "" ? getTrending({ signal }) : searchBooks(trimmed, { signal }),
    supabase.from("favorites").select("ol_key,book_id"),
  ]);

  const ownedBooks = readOwned(settled[0]);
  const catalogBooks = readCatalog(settled[1]);

  if (ownedBooks === null && catalogBooks === null) {
    throw new Error("Both the library and the catalog are unreachable");
  }

  // Which books are bookmarked is a separate lookup now, so paint the flag onto
  // whichever shelf each favorite points at.
  const favorites = settled[2].status === "fulfilled" ? settled[2].value : null;
  if (favorites?.error) {
    console.log(favorites.error);
  }
  const index = favoriteIndex(favorites?.data);

  let warning = null;
  if (ownedBooks === null) {
    warning = "Your library is unavailable — showing catalog results only.";
  } else if (catalogBooks === null) {
    warning = "Open Library is unavailable — showing your own books only.";
  }

  return {
    books: paintFavorites(
      [...(ownedBooks ?? []), ...(catalogBooks ?? [])],
      index,
    ),
    warning,
  };
};

/**
 * The `/books` route.
 *
 * @param {object} props
 * @param {string} props.searchString - Current search box value, owned by App so
 *   it survives navigation (the add-book flow sets it before redirecting here).
 * @param {(value: string) => void} props.setSearchString - Clears/sets that value.
 * @param {(e: Event) => void} props.handleSearchString - onChange handler from App.
 * @param {(page: string) => void} props.setActivePage - Tells Header which nav
 *   item to highlight.
 */
const AllBooksPage = ({
  searchString,
  setSearchString,
  handleSearchString,
  setActivePage,
}) => {
  const [arrayBooks, setArrayBooks] = useState([]);
  const [bookDetail, setBookDetail] = useState({});
  const [showModalDetails, setShowModalDetails] = useState(false);
  const [showModalUpdate, setShowModalUpdate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [favoriteError, setFavoriteError] = useState(null);

  // Bumping this token is what triggers a load; the query lives in a ref so
  // that re-running the same search still refetches.
  const [reloadToken, setReloadToken] = useState(0);
  const queryRef = useRef(searchString);
  const debounceRef = useRef(null);

  /**
   * Triggers a fresh load of the shelf.
   *
   * Stores the query in a ref and bumps the token the fetch effect depends on.
   * Going through a token rather than the query itself means re-submitting the
   * *same* search still refetches, which a query-keyed effect would skip.
   *
   * @param {string} query - The term to load; empty string browses.
   */
  const startLoad = (query) => {
    queryRef.current = query;
    setIsLoading(true);
    setErrorMessage(null);
    setWarningMessage(null);
    setReloadToken((token) => token + 1);
  };

  /**
   * Runs a search, debounced.
   *
   * Both the Enter key and the Search button call this, and a user can trigger
   * both within a few milliseconds. Open Library allows roughly one request per
   * second, so the trailing debounce collapses a burst into a single call.
   *
   * Note the name is a long-standing typo ("Sarch") kept because it is passed
   * around as a prop; renaming it is a refactor, not a documentation change.
   */
  const handleSarch = () => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => startLoad(searchString),
      SEARCH_DEBOUNCE_MS,
    );
  };

  /**
   * Reloads everything, for writes that change *which books exist* — an edit or
   * a delete. Passed to the modals.
   *
   * Stable identity via useCallback because it is handed to memoized children.
   */
  const fetchData = useCallback(() => startLoad(queryRef.current), []);

  /**
   * Reloads *only* the bookmark flags, for writes that change which books are
   * favorited but not which exist. Passed to every BookCard.
   *
   * Bookmarking used to call the full `fetchData`, which re-fetched all three
   * sources — including a ~2 second Open Library call that could not possibly
   * have changed. That made a bookmark take 5–6 seconds to appear. Re-querying
   * the one small table and repainting brings it to roughly 400 ms.
   *
   * Failures are logged, not surfaced: the write itself already succeeded, and
   * BookCard reports write errors separately.
   */
  const refreshFavorites = useCallback(async () => {
    const { data, error } = await supabase
      .from("favorites")
      .select("ol_key,book_id");
    if (error) {
      console.log(error);
      return;
    }
    const index = favoriteIndex(data);
    setArrayBooks((books) => paintFavorites(books, index));
  }, []);

  useEffect(() => {
    setActivePage("allbooks");
    window.scroll({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [setActivePage]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBooks(queryRef.current, controller.signal)
      .then(({ books, warning }) => {
        setArrayBooks(books);
        setWarningMessage(warning);
        setIsLoading(false);
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        console.log(error);
        setErrorMessage("Could not load books. Please try again.");
        setArrayBooks([]);
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [reloadToken]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  /** Clears the search box and returns the shelf to the browse view. */
  const clearSearch = () => {
    setSearchString("");
    startLoad("");
  };

  const searchBar = (
    <div className="searchbar-container">
      <div className="searchfield">
        <input
          onChange={handleSearchString}
          className="searchinput-allpages"
          type="text"
          name="bookSearch"
          aria-label="Search books by title"
          placeholder="Look for a title"
          value={searchString}
          onKeyUp={(e) => e.key === "Enter" && handleSarch()}
          onKeyDown={(e) => e.key === "Escape" && clearSearch()}
        />
        {searchString !== "" && (
          <button
            type="button"
            className="searchclear"
            aria-label="Clear search"
            onClick={clearSearch}
          >
            ×
          </button>
        )}
      </div>
      <div className="homepage-minorr">
        <button type="button" className="button-allpages" onClick={handleSarch}>
          Search
        </button>
      </div>
    </div>
  );

  /**
   * Picks what fills the shelf area: skeletons, an error, an empty state, or the
   * books themselves. Ordered so loading always wins over stale content.
   */
  const body = () => {
    // Skeletons sized to the real card, so the shelf does not jump when the
    // covers arrive.
    if (isLoading) {
      return (
        <div className="bookshelf-allbooks" aria-busy="true">
          {Array.from({ length: 12 }, (_, i) => (
            <div className="bookcard" key={`skeleton-${i}`}>
              <div className="book-container">
                <div className="skeleton-cover" />
              </div>
              <div className="shelf" />
            </div>
          ))}
        </div>
      );
    }
    if (errorMessage) {
      return (
        <div className="nobooks">
          {errorMessage}
          <span className="nobooks-hint">
            Check your connection, then search again.
          </span>
        </div>
      );
    }
    if (arrayBooks.length === 0) {
      return (
        <div className="nobooks">
          Nothing on this shelf
          <span className="nobooks-hint">
            {searchString
              ? `No books match “${searchString}”. Try a shorter title, or a different spelling.`
              : "Search for a title to pull books from Open Library."}
          </span>
        </div>
      );
    }
    return (
      <div className="bookshelf-allbooks">
        {arrayBooks.map((book) => (
          <BookCard
            key={bookKey(book)}
            book={book}
            setShowModalDetails={setShowModalDetails}
            setBookDetail={setBookDetail}
            fetchData={refreshFavorites}
            onFavoriteError={setFavoriteError}
          />
        ))}
        {showModalDetails && (
          <DetailsBook
            bookDetail={bookDetail}
            setBookDetail={setBookDetail}
            showModalDetails={showModalDetails}
            setShowModalDetails={setShowModalDetails}
            setShowModalUpdate={setShowModalUpdate}
            showModalUpdate={showModalUpdate}
            fetchData={fetchData}
          />
        )}
        {showModalUpdate && (
          <UpdateBook
            bookDetail={bookDetail}
            setBookDetail={setBookDetail}
            showModalDetails={showModalDetails}
            setShowModalDetails={setShowModalDetails}
            setShowModalUpdate={setShowModalUpdate}
            showModalUpdate={showModalUpdate}
            fetchData={fetchData}
          />
        )}
      </div>
    );
  };

  return (
    <div className="allbookspage">
      {searchBar}
      {warningMessage && <div className="shelf-notice">{warningMessage}</div>}
      {favoriteError && <div className="shelf-notice">{favoriteError}</div>}
      {body()}
    </div>
  );
};

export default AllBooksPage;
