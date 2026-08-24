/**
 * @file The `/addbook` route — the form for creating a book of your own.
 *
 * This is the app's only *create* path. Open Library is read-only, so anything
 * the user adds lives in the Supabase `books` table and is theirs to edit or
 * delete later.
 *
 * Flow: validate locally → check Supabase for a title collision → insert → show
 * the `SubmitFormOutput` confirmation modal. That modal's "Finish" button
 * navigates to /books *and* sets the shared search term to the new title, which
 * is why the books page must search Supabase as well as Open Library — otherwise
 * a freshly added book would appear to vanish.
 *
 * @see ARCHITECTURE.md §5
 */

import { useState } from "react";
import { useEffect } from "react";
import supabase from "../utils/config";
import "../styles/pages/AddBookPage.css";
import SubmitFormOutput from "../components/SubmitFormOutput";

/**
 * A blank form, with a fresh client-generated id.
 *
 * This is a **function**, not a constant, and that is load-bearing. It used to be
 * a module-scope object literal, which meant the random id was evaluated once
 * when the module loaded — so adding two books without a page refresh reused the
 * same id and the second insert died on the primary key.
 *
 * TODO(doc): the id is generated client-side with Math.random(), which suggests
 * `books.id` has no usable database default — but that could not be confirmed
 * from the code alone. If the column is an identity column, this should be
 * dropped and left to Postgres, which would also remove the collision risk
 * entirely (1-in-a-million per pair today).
 *
 * @returns {object} An empty form object ready for `useState`.
 */
const emptyForm = () => ({
  id: Math.ceil(Math.random() * 1000000),
  title: "",
  image: "",
  synopsis: "",
  publisher: "",
  subjects: [],
  authors: [],
  isbn13: "",
  date_published: "",
  pages: "",
});

/**
 * Fields that must be non-blank to submit. `authors` and `subjects` are checked
 * separately because they are arrays, not strings.
 */
const REQUIRED_TEXT_FIELDS = [
  "title",
  "image",
  "synopsis",
  "publisher",
  "isbn13",
  "date_published",
  "pages",
];

/**
 * Returns the names of every field the user still has to fill in.
 *
 * Returning names rather than a boolean is what lets the form mark each offending
 * input individually with `aria-invalid`.
 *
 * Historical note worth keeping: `isbn13` and `date_published` were once compared
 * against the *number* `0` while holding strings, so those two guards could never
 * fire and both fields could be submitted empty.
 *
 * @param {object} formData - The current form state.
 * @returns {string[]} Field names, empty when the form is complete.
 */
const missingFields = (formData) => {
  const missing = REQUIRED_TEXT_FIELDS.filter(
    (field) => String(formData[field]).trim() === "",
  );
  if (formData.authors.length === 0) missing.push("authors");
  if (formData.subjects.length === 0) missing.push("subjects");
  return missing;
};

/**
 * The `/addbook` route.
 *
 * @param {object} props
 * @param {(page: string) => void} props.setActivePage - Highlights the nav item.
 * @param {(value: string) => void} props.setSearchString - Handed to the
 *   confirmation modal so "Finish" can search for the book just created.
 */
const AddBookPage = ({ setActivePage, setSearchString }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [newBookModal, setNewBookModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [invalidFields, setInvalidFields] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Updates one field.
   *
   * `authors` and `subjects` are `text[]` columns in Postgres but single text
   * inputs in the UI, so a value is wrapped into a one-element array — and a
   * blank one collapses to `[]` so the required-field check still catches it.
   *
   * @param {Event} e - Change event from an input or textarea.
   */
  const handleInput = (e) => {
    const { name, value } = e.target;
    const next =
      name === "authors" || name === "subjects"
        ? { ...formData, [name]: value.trim() === "" ? [] : [value] }
        : { ...formData, [name]: value };
    setFormData(next);
    // Clear a field's error as soon as it is filled in, rather than waiting for
    // the next submit.
    if (invalidFields.includes(name) && String(value).trim() !== "") {
      setInvalidFields((fields) => fields.filter((field) => field !== name));
    }
  };

  /**
   * Validates, checks for a duplicate title, and inserts the book.
   *
   * Duplicate detection is a case-insensitive title match against `books` only —
   * it deliberately does not consult Open Library, since the point is to keep
   * *your own shelf* free of repeats, not to stop you adding a book that also
   * exists in a catalogue of millions.
   *
   * @param {Event} e - Submit/click event; default is prevented.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = missingFields(formData);
    setInvalidFields(missing);
    if (missing.length > 0) {
      setErrorMessage(
        `Add ${missing.length} more ${missing.length === 1 ? "detail" : "details"} before saving.`,
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    // Duplicate detection: the catalog is huge, but your own shelf should not
    // hold the same title twice.
    const { data: existing, error: lookupError } = await supabase
      .from("books")
      .select("id")
      .ilike("title", formData.title.trim())
      .limit(1);

    if (lookupError) {
      console.log(lookupError);
      setIsSaving(false);
      setErrorMessage(`Could not check for duplicates: ${lookupError.message}`);
      return;
    }
    if (existing?.length) {
      setIsSaving(false);
      setErrorMessage(
        `“${formData.title.trim()}” is already on your shelf. Edit the existing copy instead.`,
      );
      return;
    }

    const { error } = await supabase.from("books").insert(formData);
    setIsSaving(false);
    if (error) {
      // Previously the success modal opened regardless, so a failed insert
      // still reported "Item Created!".
      console.log(error);
      setErrorMessage(`Could not save that book: ${error.message}`);
      return;
    }
    setErrorMessage(null);
    setNewBookModal(true);
  };

  const placeholder_summary = `The sequel to the Golden Globe-nominated and AFI Award-winning "The Lord of the Rings: The Fellowship of the Ring," "The Two Towers" follows the continuing quest of Frodo (Elijah Wood) and the Fellowship to destroy the One Ring. Frodo and Sam (Sean Astin) discover they are being followed by the mysterious Gollum. Aragorn (Viggo Mortensen), the Elf archer Legolas and Gimli the Dwarf encounter the besieged Rohan kingdom, whose once great King Theoden has fallen under Saruman's deadly spell.`;

  useEffect(() => {
    setActivePage("addbook");
    window.scroll({
      top: 0,
      left: 0,
      behavior: "instant",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="addbookspage">
      <form className="form-addbook">
        <div className="column-form1">
          <label className="label-form" htmlFor="title">
            Title
          </label>
          <input
            className="input-form"
            onChange={handleInput}
            type="text"
            name="title"
            aria-invalid={invalidFields.includes("title")}
            value={formData.title}
            placeholder="e.g: Lord of the Rings: The Two Towers"
            required
          />
          <label className="label-form" htmlFor="authors">
            Author
          </label>
          <input
            className="input-form"
            onChange={handleInput}
            type="text"
            name="authors"
            aria-invalid={invalidFields.includes("authors")}
            value={formData.authors}
            placeholder="J.R. Tolkien"
            required
          />
          <label className="label-form" htmlFor="subjects">
            Subjects
          </label>
          <input
            className="input-form"
            onChange={handleInput}
            type="text"
            name="subjects"
            aria-invalid={invalidFields.includes("subjects")}
            value={formData.subjects}
            placeholder="Fantasy Fiction"
            required
          />
          <label className="label-form" htmlFor="isbn13">
            ISBN13
          </label>
          <input
            className="input-form"
            onChange={handleInput}
            type="number"
            name="isbn13"
            aria-invalid={invalidFields.includes("isbn13")}
            value={formData.isbn13}
            placeholder="9439391912312"
            required
          />
        </div>
        <div className="column-form1">
          <label className="label-form" htmlFor="publisher">
            Publisher
          </label>
          <input
            className="input-form"
            onChange={handleInput}
            type="text"
            name="publisher"
            aria-invalid={invalidFields.includes("publisher")}
            value={formData.publisher}
            placeholder="Houghton Mifflin Harcourt"
            required
          />
          <label className="label-form" htmlFor="date_published">
            Publishing Date
          </label>
          <input
            className="input-form"
            onChange={handleInput}
            type="text"
            name="date_published"
            aria-invalid={invalidFields.includes("date_published")}
            value={formData.date_published}
            placeholder="11-11-1954"
            required
          />
          <label className="label-form" htmlFor="pages">
            Pages
          </label>
          <input
            className="input-form"
            onChange={handleInput}
            type="number"
            name="pages"
            aria-invalid={invalidFields.includes("pages")}
            value={formData.pages}
            placeholder="464"
            required
          />
          <label className="label-form" htmlFor="image">
            Cover Picture (URL)
          </label>
          <input
            className="input-form"
            onChange={handleInput}
            type="text"
            name="image"
            aria-invalid={invalidFields.includes("image")}
            value={formData.image}
            placeholder="https://i.harperapps.com/hcanz/covers/9780007203550/x145.jpg"
            required
          />
        </div>
        <div className="column-form2">
          <label className="label-form" htmlFor="synopsis">
            Synopsis
          </label>
          <textarea
            className="textarea-form"
            onChange={handleInput}
            type="text"
            name="synopsis"
            aria-invalid={invalidFields.includes("synopsis")}
            value={formData.synopsis}
            placeholder={placeholder_summary}
            required
          />
          <button
            type="submit"
            className="button-form"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save book"}
          </button>
          {errorMessage && <p className="errormessage">{errorMessage}</p>}
        </div>
      </form>
      {newBookModal && (
        <SubmitFormOutput data={formData} setSearchString={setSearchString} />
      )}
    </div>
  );
};

export default AddBookPage;
