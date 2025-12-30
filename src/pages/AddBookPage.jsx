import { useState } from "react";
import { useEffect } from "react";
import supabase from "../utils/config";
import "../styles/pages/AddBookPage.css";
import SubmitFormOutput from "../components/SubmitFormOutput";

const formInitialState = {
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
};

const AddBookPage = ({ setActivePage, setSearchString }) => {
  const [formData, setFormData] = useState(formInitialState);
  const [newBookModal, setNewBookModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(false);

  const handleInput = (e) => {
    const { name, value } = e.target;
    if (name === "authors" || name === "subjects") {
      setFormData({ ...formData, [name]: [value] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    } = formData;
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
      setErrorMessage(true);
      setTimeout(() => setErrorMessage(false), 2000);
    } else {
      const { error } = await supabase.from("books").insert(formData);
      if (error) {
        console.log(error);
      }
      setNewBookModal(true);
    }
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
            value={formData.synopsis}
            placeholder={placeholder_summary}
            required
          />
          <button className="button-form" onClick={handleSubmit}>
            Submit
          </button>
          {errorMessage && (
            <p className="errormessage">Please fill up all the fields!</p>
          )}
        </div>
      </form>
      {newBookModal && (
        <SubmitFormOutput data={formData} setSearchString={setSearchString} />
      )}
    </div>
  );
};

export default AddBookPage;
