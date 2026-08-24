/**
 * @file The root component: declares the routes and owns cross-page state.
 *
 * Two pieces of state live here because more than one route needs them:
 *
 * - `searchString` — shared so a term survives navigation. The home page collects
 *   it and the books page runs it; the add-book flow sets it before redirecting.
 * - `activePage` — which nav item the header highlights. Every page sets this
 *   from an effect on mount.
 *
 * There is no state library; both are prop-drilled.
 *
 * TODO(doc): `activePage` duplicates information React Router already has. Its
 * `NavLink` component sets an active class from the current URL natively, which
 * would remove this state, its prop on four routes, and an effect in each page.
 * Whether it predates that knowledge or was a deliberate choice is not something
 * the code reveals.
 */

import { Route, Routes } from "react-router-dom";
import { useState } from "react";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import HomePage from "./pages/HomePage.jsx";
import AllBooksPage from "./pages/AllBooksPage.jsx";
import FavoritesPage from "./pages/FavoritesPage.jsx";
import AddBookPage from "./pages/AddBookPage.jsx";
import "./App.css";

/** The root component. Renders the header, the routed page, and the footer. */
function App() {
  const [searchString, setSearchString] = useState("");
  const [activePage, setActivePage] = useState("home");

  /**
   * Shared onChange for every search input in the app.
   *
   * @param {Event} e - Change event from a text input.
   */
  const handleSearchString = (e) => {
    setSearchString(e.target.value);
  };

  return (
    <>
      <Header activePage={activePage} setSearchString={setSearchString} />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              setActivePage={setActivePage}
              searchString={searchString}
              setSearchString={setSearchString}
              handleSearchString={handleSearchString}
            />
          }
        ></Route>
        <Route
          path="/books"
          element={
            <AllBooksPage
              setActivePage={setActivePage}
              searchString={searchString}
              setSearchString={setSearchString}
              handleSearchString={handleSearchString}
            />
          }
        ></Route>
        <Route
          path="/favorites"
          element={<FavoritesPage setActivePage={setActivePage} />}
        ></Route>
        <Route
          path="/addbook"
          element={
            <AddBookPage
              setActivePage={setActivePage}
              setSearchString={setSearchString}
            />
          }
        ></Route>
      </Routes>
      <Footer />
    </>
  );
}

export default App;
