/**
 * @file An animated page-turning book, used as a loading indicator.
 *
 * The markup is a stack of empty divs that exist purely as animation targets;
 * all of the actual work happens in styles/components/Loading.css. That is why
 * the elements have no semantic content.
 *
 * Now used only by FavoritesPage. The books shelf switched to skeleton cards,
 * which reserve the right amount of space and so avoid the layout shift a
 * centred spinner causes.
 */

import "../styles/components/Loading.css";

/** The loading indicator. Takes no props. */
const Loading = () => {
  return (
    <div className="book-load">
      <div className="book__pg-shadow"></div>
      <div className="book__pg"></div>
      <div className="book__pg book__pg--2"></div>
      <div className="book__pg book__pg--3"></div>
      <div className="book__pg book__pg--4"></div>
      <div className="book__pg book__pg--5"></div>
    </div>
  );
};

export default Loading;
