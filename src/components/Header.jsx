/**
 * @file The site header: wordmark, navigation, and the light/dark toggle.
 *
 * Rendered once by App, above the routed page, and sticky at the top of every
 * screen.
 *
 * The theme toggle writes `data-theme` onto `<html>` and mirrors it to
 * localStorage. It works with a matching inline script in index.html that
 * applies the stored value *before* React mounts — without that, an explicitly
 * chosen theme would flash the other one on every page load.
 *
 * Three theme states exist: no attribute (follow the OS), "light", and "dark".
 * The tokens stylesheet handles all three.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import logo_slogan from "../assets/images/logo_slogan.png";
import "../styles/components/Header.css";

const STORAGE_KEY = "wr-theme";

/**
 * Reads the theme index.html already resolved before paint.
 *
 * @returns {"light"|"dark"|null} null means no explicit choice has been made, so
 *   the OS preference applies.
 */
const readTheme = () => document.documentElement.dataset.theme ?? null;

/**
 * Whether the OS currently prefers a dark colour scheme. Used only to label the
 * toggle correctly when the user has not chosen a theme themselves.
 *
 * @returns {boolean}
 */
const systemPrefersDark = () =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

/**
 * The site header.
 *
 * @param {object} props
 * @param {(value: string) => void} props.setSearchString - Clears the shared
 *   search term when navigating Home or Books, so a stale query does not follow
 *   the user around.
 * @param {string} props.activePage - Which nav item to highlight. Each page sets
 *   this from an effect on mount.
 */
const Header = ({ setSearchString, activePage }) => {
  const [theme, setTheme] = useState(readTheme);

  const isDark = theme ? theme === "dark" : systemPrefersDark();

  /**
   * Flips the theme and remembers the choice.
   *
   * Writes the attribute directly rather than waiting for a render, so the
   * change is applied even if the storage write below throws.
   */
  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). The theme
      // still applies for this session, it just will not be remembered.
    }
  };

  return (
    <div className="header">
      <img className="logo-slogan" src={logo_slogan} alt="Wordsmith Retreat" />
      <ul>
        <Link to="/" onClick={() => setSearchString("")}>
          <li className={activePage === "home" ? "active" : undefined}>Home</li>
        </Link>
        <Link to="/books" onClick={() => setSearchString("")}>
          <li className={activePage === "allbooks" ? "active" : undefined}>
            Books
          </li>
        </Link>
        <Link to="/favorites">
          <li className={activePage === "favorites" ? "active" : undefined}>
            Favorites
          </li>
        </Link>
        <Link to="/addbook">
          <li className={activePage === "addbook" ? "active" : undefined}>
            Add Book
          </li>
        </Link>
      </ul>
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-pressed={isDark}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      >
        {isDark ? "Light" : "Dark"}
      </button>
    </div>
  );
};

export default Header;
