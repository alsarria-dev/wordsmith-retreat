/**
 * @file The edit modal for books the user created.
 *
 * Reached from the details modal, and only ever shown for a book whose
 * `source === "supabase"` — Open Library records cannot be edited.
 *
 * Form state is seeded once from the book passed in and is *not* re-synced if
 * that prop later changes, which is fine because the modal is unmounted between
 * uses.
 */

import { useState } from "react";
import supabase from "../utils/config";
import "../styles/components/UpdateBook.css";

/**
 * The edit modal.
 *
 * @param {object} props
 * @param {object} props.bookDetail - The book being edited. Seeds the form.
 * @param {(book: object) => void} props.setBookDetail - Updates the parent's copy
 *   after a successful save.
 * @param {boolean} props.showModalDetails
 * @param {(open: boolean) => void} props.setShowModalDetails
 * @param {boolean} props.showModalUpdate
 * @param {(open: boolean) => void} props.setShowModalUpdate
 * @param {() => void} props.fetchData - Refreshes the parent list after saving.
 */
const UpdateBook = ({
  bookDetail,
  setBookDetail,
  showModalDetails,
  setShowModalDetails,
  showModalUpdate,
  setShowModalUpdate,
  fetchData,
}) => {
  const closeUpdate = () => {
    setShowModalUpdate(!showModalUpdate);
    setShowModalDetails(!showModalDetails);
  };

  const [formDataUpdate, setUpdateInitialState] = useState({
    id: bookDetail.id,
    title: bookDetail.title,
    image: bookDetail.image,
    synopsis: bookDetail.synopsis,
    publisher: bookDetail.publisher,
    subjects: bookDetail.subjects,
    authors: bookDetail.authors,
    isbn13: bookDetail.isbn13,
    date_published: bookDetail.date_published,
    pages: bookDetail.pages,
  });

  const handleInputUpdate = (e) => {
    const { name, value } = e.target;
    if (name === "authors" || name === "subjects") {
      setUpdateInitialState({ ...formDataUpdate, [name]: [value] });
    } else {
      setUpdateInitialState({ ...formDataUpdate, [name]: value });
    }
  };

  /**
   * Validates and saves the edits.
   *
   * TODO(doc): this validation compares `isbn13` and `date_published` against the
   * number 0 while both hold strings, so those two guards never fire — the same
   * bug that was fixed in AddBookPage. Whether that is intentional here (perhaps
   * to let a user blank a field) or simply missed could not be determined from
   * the code. Documenting rather than fixing, since this is a docs-only task.
   *
   * Note the modal closes and the list refreshes regardless of outcome, so a
   * failed save looks identical to a successful one.
   */
  const handleSubmitUpdate = async () => {
    console.log(formDataUpdate);
    const {
      title,
      image,
      synopsis,
      publisher,
      subjects,
      authors,
      isbn13,
      date_published,
      pages,
    } = formDataUpdate;
    if (
      title === "" ||
      image === "" ||
      synopsis === "" ||
      publisher === "" ||
      subjects.length === 0 ||
      authors.length === 0 ||
      isbn13 === 0 ||
      date_published === 0 ||
      pages === ""
    ) {
      console.log("error");
    } else {
      const { error } = await supabase
        .from("books")
        .update(formDataUpdate)
        .eq("id", bookDetail.id);
      if (error) {
        console.log(error);
      } else {
        // Spread over the original so `source` survives the edit — the details
        // modal keys its Update/Delete buttons off it.
        setBookDetail({ ...bookDetail, ...formDataUpdate });
      }
    }
    closeUpdate();
    fetchData();
    setShowModalDetails(!showModalDetails);
  };

  return (
    <div className="details-container">
      <div className="details-modal">
        <div className="details-info-container1">
          <img
            className="img-details"
            src={bookDetail.image}
            alt="book detail image"
          />
          <button
            type="button"
            className="button-details"
            onClick={handleSubmitUpdate}
          >
            Save
          </button>
          <button
            type="button"
            className="button-details"
            onClick={closeUpdate}
          >
            Cancel
          </button>
        </div>
        <div className="details-info-container2">
          <input
            onChange={handleInputUpdate}
            type="text"
            name="title"
            value={formDataUpdate.title}
            required
          />
          <input
            onChange={handleInputUpdate}
            type="text"
            name="authors"
            value={formDataUpdate.authors}
            required
          />
          <input
            onChange={handleInputUpdate}
            type="text"
            name="subjects"
            value={formDataUpdate.subjects}
            required
          />
          <input
            onChange={handleInputUpdate}
            type="number"
            name="isbn13"
            value={formDataUpdate.isbn13}
            required
          />
          <input
            onChange={handleInputUpdate}
            type="text"
            name="publisher"
            value={formDataUpdate.publisher}
            required
          />
          <input
            onChange={handleInputUpdate}
            type="text"
            name="date_published"
            value={formDataUpdate.date_published}
            required
          />
          <input
            onChange={handleInputUpdate}
            type="number"
            name="pages"
            value={formDataUpdate.pages}
            required
          />
          <textarea
            onChange={handleInputUpdate}
            type="text"
            name="synopsis"
            value={formDataUpdate.synopsis}
            required
          />
        </div>
      </div>
    </div>
  );
};

export default UpdateBook;
