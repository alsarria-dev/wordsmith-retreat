/**
 * @file One book on the shelf: its cover, and the bookmark that saves it.
 *
 * Rendered many times per page (48+ on a full shelf), which drives two
 * decisions:
 *
 * - It is wrapped in `memo`, so opening a modal does not re-render every card.
 *   That only holds while every prop keeps a stable identity — the two setters
 *   are `useState` setters, and the pages wrap the callbacks in `useCallback`.
 *   Passing an inline arrow function here would silently defeat the memo.
 * - It owns the bookmark *write*, so the write path is short: click → one
 *   insert or delete → ask the parent to repaint the flags.
 *
 * Works with books from either source; `book.source` decides how a bookmark is
 * keyed.
 */

import { memo } from "react";
import book_placeholder from "../assets/images/logo_books.png";
import supabase from "../utils/config";
import { favoriteMatch, toFavoriteRow } from "../utils/normalizeBook";

/**
 * Bookmarks a book by inserting a snapshot row into `favorites`.
 *
 * Works identically for both sources — `toFavoriteRow` sets `ol_key` for a
 * catalogue book or `book_id` for one of the user's own. Bookmarks live in their
 * own table precisely so a read-only Open Library book can be bookmarked at all;
 * it has no row in `books` to flag, and none can be created there.
 *
 * @param {object} book - A normalized book.
 * @returns {Promise<{error: object|null}>} A supabase-js result — errors are
 *   resolved, not thrown.
 */
const addFavorite = (book) =>
  supabase.from("favorites").insert(toFavoriteRow(book));

/**
 * Removes a bookmark, matching on whichever column identifies this book.
 *
 * @param {object} book - A normalized book.
 * @returns {Promise<{error: object|null}>} A supabase-js result.
 */
const removeFavorite = (book) => {
  const { column, value } = favoriteMatch(book);
  return supabase.from("favorites").delete().eq(column, value);
};

// Memoized because the shelf renders 48+ of these: without it, opening a details
// modal re-rendered every card. That only holds while every prop below keeps a
// stable identity — the two setters are useState setters, and `fetchData` /
// `onFavoriteError` are wrapped in useCallback by the pages.
/**
 * One book on the shelf.
 *
 * @param {object} props
 * @param {object} props.book - A normalized book from either source.
 * @param {(open: boolean) => void} props.setShowModalDetails - Opens the details
 *   modal. Note this component does **not** receive the current open state:
 *   taking that prop would change on every modal toggle and re-render all cards,
 *   defeating the memo.
 * @param {(book: object) => void} props.setBookDetail - Tells the parent which
 *   book the modal should show.
 * @param {() => void} props.fetchData - Asks the parent to refresh after a
 *   bookmark write. Must be referentially stable.
 * @param {(message: string|null) => void} [props.onFavoriteError] - Surfaces a
 *   failed write to the user; called with null on success to clear it.
 */
const BookCard = memo(function BookCard({
  book,
  setShowModalDetails,
  setBookDetail,
  fetchData,
  onFavoriteError,
}) {
  /**
   * Toggles the bookmark.
   *
   * Errors are reported to the parent rather than swallowed. This path failing
   * silently is exactly how a missing database column once looked like a dead
   * button, so a visible message matters here.
   *
   * @param {object} book - The book whose bookmark was clicked.
   */
  const favoriteAddRemove = async (book) => {
    const { error } = book.favorite
      ? await removeFavorite(book)
      : await addFavorite(book);
    if (error) {
      console.log(error);
      onFavoriteError?.(
        `Could not ${book.favorite ? "remove" : "save"} that bookmark: ${error.message}`,
      );
      return;
    }
    onFavoriteError?.(null);
    fetchData();
  };

  const displayDetailsModal = (book) => {
    setBookDetail(book);
    setShowModalDetails(true);
  };

  return (
    <div className="bookcard">
      <div className="book-container">
        <div className="book">
          {/* Real buttons rather than click handlers on <img>: these are the two
              actions on the shelf, and both need keyboard and screen readers.
              The foil state is driven off aria-pressed in CSS. */}
          <button
            type="button"
            className="bookmark"
            aria-pressed={book.favorite}
            aria-label={
              book.favorite
                ? `Remove ${book.title} from favorites`
                : `Save ${book.title} to favorites`
            }
            onClick={() => favoriteAddRemove(book)}
          />
          <button
            type="button"
            className="bookpic"
            aria-label={`View details for ${book.title}`}
            onClick={() => displayDetailsModal(book)}
          >
            <img
              src={book.image ?? book_placeholder}
              alt=""
              onError={(e) => {
                e.currentTarget.src = book_placeholder;
              }}
            />
          </button>
        </div>
      </div>
      <div className="shelf"></div>
    </div>
  );
});

export default BookCard;
