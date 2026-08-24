/**
 * @file The book details modal — and the only place a book can be deleted.
 *
 * Shows the full record for one book, laid out like a library catalogue card:
 * prose in the book face, bibliographic values in mono.
 *
 * Two behaviours are worth knowing:
 *
 * - **Update and Delete only appear for the user's own books.** Open Library has
 *   no public write API, so those actions are gated on `book.source`.
 * - **The synopsis is fetched when the modal opens.** Search responses carry at
 *   most a first sentence; the real description lives on the work record and
 *   costs a separate request. Doing it on open means one call per user click
 *   rather than one per book on the shelf.
 */

import { useEffect, useState } from "react";
import supabase from "../utils/config";
import { getWorkDescription } from "../utils/openLibrary";
import book_placeholder from "../assets/images/logo_books.png";
import "../styles/components/DetailsBook.css";

/**
 * First element of an array, or a fallback when it is missing or empty.
 *
 * Open Library returns authors and subjects as arrays that are frequently absent
 * altogether, and the UI only shows the first of each.
 *
 * @param {any[]|undefined} values
 * @param {any} fallback
 * @returns {any}
 */
const firstOr = (values, fallback) =>
  values === undefined || values.length === 0 ? fallback : values[0];

/**
 * The book details modal.
 *
 * @param {object} props
 * @param {object} props.bookDetail - The normalized book being shown.
 * @param {boolean} props.showModalDetails - Whether this modal is open; the
 *   close handlers invert it.
 * @param {(open: boolean) => void} props.setShowModalDetails
 * @param {() => void} props.fetchData - Refreshes the parent list after a delete.
 * @param {(open: boolean) => void} props.setShowModalUpdate - Opens the edit modal.
 * @param {boolean} props.showModalUpdate
 */
const DetailsBook = ({
  bookDetail,
  showModalDetails,
  setShowModalDetails,
  fetchData,
  setShowModalUpdate,
  showModalUpdate,
}) => {
  const [synopsis, setSynopsis] = useState(bookDetail.synopsis);

  // Only books in the personal library can be edited or removed — Open Library
  // has no public write API.
  const isOwned = bookDetail.source === "supabase";

  // Search results carry at most a first sentence, so pull the real description
  // from the work record once the modal is open.
  useEffect(() => {
    if (bookDetail.source !== "openlibrary") {
      return;
    }
    const controller = new AbortController();
    getWorkDescription(bookDetail.id, { signal: controller.signal })
      .then((description) => {
        if (description) {
          setSynopsis(description);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.log(error);
        }
      });
    return () => controller.abort();
  }, [bookDetail.id, bookDetail.source]);

  const closeModal = () => {
    setShowModalDetails(!showModalDetails);
  };

  const showUpdateDetails = () => {
    setShowModalUpdate(!showModalUpdate);
    setShowModalDetails(!showModalDetails);
  };

  /**
   * Permanently deletes one of the user's own books.
   *
   * Only reachable when `isOwned` is true. Note there is no confirmation step,
   * and a failed delete is logged rather than surfaced — the modal closes and
   * the list refreshes either way.
   *
   * Deleting a book also removes any bookmark pointing at it, via the
   * `on delete cascade` on `favorites.book_id`.
   *
   * @param {object} bookDetail - The book to delete.
   */
  const handleDelete = async (bookDetail) => {
    const { error } = await supabase
      .from("books")
      .delete()
      .eq("id", bookDetail.id);
    if (error) {
      console.log(error);
    }
    closeModal();
    fetchData();
  };

  return (
    <div className="details-container">
      <div className="details-modal">
        <div className="details-info-container1">
          <img
            className="img-details"
            src={bookDetail.image ?? book_placeholder}
            alt=""
            onError={(e) => {
              e.currentTarget.src = book_placeholder;
            }}
          />
          {isOwned && (
            <>
              <button
                type="button"
                className="button-details"
                onClick={showUpdateDetails}
              >
                Update
              </button>
              <button
                type="button"
                className="button-details"
                onClick={() => handleDelete(bookDetail)}
              >
                Delete Book
              </button>
            </>
          )}
          <button type="button" className="button-details" onClick={closeModal}>
            Close Details
          </button>
        </div>
        <div className="details-info-container2">
          <h2 className="details-title">{bookDetail.title}</h2>
          <p className="details-author">
            {firstOr(bookDetail.authors, "Author unknown")}
          </p>

          <dl className="details-facts">
            {[
              ["Subject", firstOr(bookDetail.subjects, "—")],
              ["ISBN 13", bookDetail.isbn13 || "—"],
              ["Publisher", bookDetail.publisher || "—"],
              ["Published", bookDetail.date_published || "—"],
              ["Pages", bookDetail.pages ?? "—"],
              [
                "Reading time",
                bookDetail.pages
                  ? `${(bookDetail.pages / 60).toFixed(1)} hrs`
                  : "—",
              ],
            ].map(([label, value]) => (
              <div className="details-fact" key={label}>
                <dt className="label">{label}</dt>
                <dd className="details-fact-value">{value}</dd>
              </div>
            ))}
          </dl>

          <p className={`synop1${synopsis ? "" : " synop1-loading"}`}>
            {synopsis ?? "No synopsis available."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DetailsBook;
