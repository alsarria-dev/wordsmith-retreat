/**
 * @file The `/favorites` route — the user's bookmark shelf.
 *
 * The simplest of the data-driven pages: it reads one table and renders it.
 * Unlike the books page there is no merging, because a `favorites` row already
 * carries a snapshot of everything needed to display the book.
 *
 * That snapshot is why this page does not call Open Library at all — see
 * `toFavoriteRow` in utils/normalizeBook.js for why the data is copied.
 *
 * Note it shares AllBooksPage.css rather than having its own stylesheet.
 */

import { useCallback, useEffect, useState } from "react";
import "../styles/pages/AllBooksPage.css";
import supabase from "../utils/config";
import { bookKey, fromFavorite } from "../utils/normalizeBook";
import UpdateBook from "../components/UpdateBook";
import BookCard from "../components/BookCard";
import DetailsBook from "../components/DetailsBook";
import Loading from "../components/Loading";

/**
 * Loads every bookmark, newest first.
 *
 * Kept at module scope and free of setState so the mount effect can call it
 * without tripping `react-hooks/set-state-in-effect`.
 *
 * @returns {Promise<object[]|null>} Normalized books, or null if the query
 *   failed (logged, not thrown — the page then simply renders empty).
 */
const fetchFavoriteBooks = async () => {
  const { data, error } = await supabase
    .from("favorites")
    .select()
    .order("id", { ascending: false });
  if (error) {
    console.log(error);
    return null;
  }
  return (data ?? []).map((row) => fromFavorite(row));
};

/**
 * The `/favorites` route.
 *
 * @param {object} props
 * @param {(page: string) => void} props.setActivePage - Highlights the nav item.
 */
const FavoritesPage = ({ setActivePage }) => {
  const [arrayFavoriteBooks, setArrayFavoriteBooks] = useState([]);
  const [favBookDetail, setFavBookDetail] = useState({});
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [showModalFavoriteUpdate, setShowModalFavoriteUpdate] = useState(false);
  const [isLoading1, setIsLoading1] = useState(true);
  const [favoriteError, setFavoriteError] = useState(null);

  /**
   * Reloads the shelf. Passed to the cards and modals so un-bookmarking or
   * deleting removes the book from view.
   *
   * The loading flag tracks the real request; it previously ran off a fixed 1
   * second timer that fired whether or not the data had arrived.
   */
  const fetchDataFavorites = useCallback(async () => {
    setIsLoading1(true);
    const data = await fetchFavoriteBooks();
    if (data) setArrayFavoriteBooks(data);
    setIsLoading1(false);
  }, []);

  useEffect(() => {
    setActivePage("favorites");
    fetchFavoriteBooks().then((data) => {
      if (data) setArrayFavoriteBooks(data);
      setIsLoading1(false);
    });
    window.scroll({
      top: 0,
      left: 0,
      behavior: "instant",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading1) {
    return (
      <div className="allbookspage">
        <div className="nobooks1">
          <Loading />
        </div>
      </div>
    );
  } else if (arrayFavoriteBooks.length !== 0) {
    return (
      <div className="allbookspage">
        {favoriteError && <div className="shelf-notice">{favoriteError}</div>}
        <div className="bookshelf-allbooks">
          {arrayFavoriteBooks.map((book) => {
            return (
              <BookCard
                key={bookKey(book)}
                book={book}
                setShowModalDetails={setShowFavoriteModal}
                setBookDetail={setFavBookDetail}
                fetchData={fetchDataFavorites}
                onFavoriteError={setFavoriteError}
              />
            );
          })}
        </div>
        {/* bookDetail, showModalDetails, setShowModalDetails, searchString, handleSarch */}
        {showFavoriteModal && (
          <DetailsBook
            bookDetail={favBookDetail}
            setBookDetail={setFavBookDetail}
            showModalDetails={showFavoriteModal}
            setShowModalDetails={setShowFavoriteModal}
            fetchData={fetchDataFavorites}
            setShowModalUpdate={setShowModalFavoriteUpdate}
            showModalUpdate={showModalFavoriteUpdate}
          />
        )}
        {showModalFavoriteUpdate && (
          <UpdateBook
            bookDetail={favBookDetail}
            setBookDetail={setFavBookDetail}
            showModalDetails={showFavoriteModal}
            setShowModalDetails={setShowFavoriteModal}
            setShowModalUpdate={setShowModalFavoriteUpdate}
            showModalUpdate={showModalFavoriteUpdate}
            fetchData={fetchDataFavorites}
          />
        )}
        {/* {showFavoriteModal && <DetailsBook bookDetail={favBookDetail} showModalDetails={showFavoriteModal} setShowModalDetails={setShowFavoriteModal} fetchData={fetchDataFavorites} setShowModalUpdate={showModalFavoriteUpdate} showModalUpdate={setShowModalFavoriteUpdate}/>} */}
        {/* {showModalFavoriteUpdate && <UpdateBook bookDetail={favBookDetail} setBookDetail={setBookDetail} showModalDetails={showFavoriteModal} setShowModalDetails={setShowFavoriteModal} setShowModalUpdate={showModalFavoriteUpdate} showModalUpdate={setShowModalFavoriteUpdate} fetchData={fetchDataFavorites} />} */}
      </div>
    );
  } else {
    return (
      <div className="allbookspage">
        <div className="nobooks">No Favorite Bookmarks</div>
      </div>
    );
  }
};

export default FavoritesPage;
