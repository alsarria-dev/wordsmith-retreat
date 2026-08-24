/**
 * @file The `/` route — the landing page.
 *
 * Purely presentational: a hero and a search box. It fetches nothing. Submitting
 * navigates to /books, which performs the actual search using the term held in
 * App's shared `searchString` state.
 */

import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import logo_books from "../assets/images/logo_books.png";
import "../styles/pages/HomePage.css";

/**
 * The `/` route.
 *
 * @param {object} props
 * @param {string} props.searchString - Shared search term, owned by App.
 * @param {(e: Event) => void} props.handleSearchString - onChange handler from App.
 * @param {(page: string) => void} props.setActivePage - Highlights the nav item.
 */
const HomePage = ({ searchString, handleSearchString, setActivePage }) => {
  const navigate = useNavigate();
  /**
   * Hands off to the books page, which reads the shared search term on mount and
   * runs the query there. Nothing is searched on this page.
   */
  const handleSubmit = () => {
    navigate("/books");
  };

  useEffect(() => {
    setActivePage("home");
    window.scroll({
      top: 0,
      left: 0,
      behavior: "instant",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="homepage">
      <div className="homepage-majorcontainer">
        <div className="homepage-majorleft">
          <img className="logo-books" src={logo_books} alt="" />
        </div>
        <div className="homepage-majorright">
          <h1 className="slogan-homepage">
            Reading, the ultimate <em>adventure</em>
          </h1>
          <p className="homepage-lede">
            Search millions of books from Open Library, and keep the ones worth
            coming back to on your own shelf.
          </p>
          <input
            onChange={handleSearchString}
            className="searchinput"
            type="text"
            name="bookSearch"
            aria-label="Search books by title"
            placeholder="Look for a title"
            value={searchString}
            onKeyUp={(e) => e.key === "Enter" && handleSubmit()}
          />
          <div className="homepage-minor">
            <button
              type="button"
              className="button_homepage"
              onClick={handleSubmit}
            >
              <span>Search</span>
              <i></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
