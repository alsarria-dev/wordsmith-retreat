/**
 * @file Translates the app's two book sources into one shape.
 *
 * Books arrive from Open Library (a read-only public catalogue) and from
 * Supabase (the user's own books, plus their bookmarks). Those three payloads
 * look nothing alike, so every one of them is funnelled through this module
 * before any component sees it.
 *
 * The normalized shape every component below the data layer assumes:
 *
 * ```
 * {
 *   source: "openlibrary" | "supabase",
 *   id, title, image, authors[], subjects[],
 *   publisher, isbn13, date_published, pages, synopsis,
 *   favorite,
 * }
 * ```
 *
 * `source` is load-bearing, not decorative: it decides which writes are allowed
 * (Open Library books cannot be edited or deleted), how a bookmark is stored,
 * and how React keys are built.
 *
 * Exports:
 * - `bookKey`       — a React key unique across both sources
 * - `fromOpenLibrary`, `fromSupabase`, `fromFavorite` — the three translators
 * - `toFavoriteRow` — the reverse direction, for writing a bookmark
 * - `favoriteMatch` — which column identifies a book in `favorites`
 *
 * @see ARCHITECTURE.md §3 for how this shape is used across the app.
 */

const COVER_BASE = "https://covers.openlibrary.org/b/id";

/**
 * Builds a cover image URL from an Open Library cover id.
 *
 * `default=false` matters: without it a missing cover returns HTTP 200 with a
 * 43-byte empty body rather than a 404, so the `<img onError>` fallback would
 * never fire and the user would see a broken image instead of the placeholder.
 *
 * @param {number|undefined} coverId - Open Library's `cover_i` field.
 * @returns {string|null} A large-size cover URL, or null when the work has no cover.
 */
const coverUrl = (coverId) =>
  coverId ? `${COVER_BASE}/${coverId}-L.jpg?default=false` : null;

/**
 * A React key that is unique across a merged, two-source list.
 *
 * The sources use different id *types* — Supabase ids are numbers, Open Library
 * ids are strings like "/works/OL27448W" — so they could collide when rendered
 * in one list. Prefixing with the source removes that risk.
 *
 * @param {object} book - A normalized book.
 * @returns {string} e.g. "openlibrary:/works/OL27448W" or "supabase:42".
 */
export const bookKey = (book) => `${book.source}:${book.id}`;

/**
 * Normalizes one document from an Open Library search or trending response.
 *
 * Every field is defaulted, because Open Library's coverage is uneven — plenty
 * of works have no cover, page count, or publisher. Downstream components render
 * these values directly and do not re-check them.
 *
 * Two fields deserve a note:
 * - `isbn13` picks the first 13-character ISBN from what is often a list of
 *   hundreds across every edition, so the one chosen is essentially arbitrary.
 *   Work-level search cannot do better.
 * - `synopsis` is only the work's first sentence, which is all a search response
 *   carries. `DetailsBook` replaces it with the real description on open.
 *
 * @param {object} doc - A raw entry from `/search.json` or `/trending/*.json`.
 * @returns {object} A normalized book with `source: "openlibrary"`.
 */
export const fromOpenLibrary = (doc) => ({
  source: "openlibrary",
  id: doc.key,
  title: doc.title ?? "Untitled",
  image: coverUrl(doc.cover_i),
  authors: doc.author_name ?? [],
  subjects: doc.subject ?? [],
  publisher: doc.publisher?.[0] ?? "Unknown",
  isbn13: doc.isbn?.find((isbn) => isbn.length === 13) ?? "",
  date_published: doc.first_publish_year
    ? String(doc.first_publish_year)
    : "Unknown",
  pages: doc.number_of_pages_median ?? null,
  // Stand-in until the real description is fetched from the work record.
  synopsis: doc.first_sentence?.[0] ?? null,
  favorite: false,
});

/**
 * Normalizes one row of the `books` table — a book the user created.
 *
 * `favorite` is always false here. Whether a book is bookmarked lives in a
 * separate table, so the caller paints that flag on during the merge (see
 * `paintFavorites` in AllBooksPage).
 *
 * @param {object} row - A row from the `books` table.
 * @returns {object} A normalized book with `source: "supabase"`.
 */
export const fromSupabase = (row) => ({
  source: "supabase",
  id: row.id,
  title: row.title ?? "Untitled",
  image: row.image || null,
  authors: row.authors ?? [],
  subjects: row.subjects ?? [],
  publisher: row.publisher ?? "Unknown",
  isbn13: row.isbn13 ?? "",
  date_published: row.date_published ?? "Unknown",
  pages: row.pages ?? null,
  synopsis: row.synopsis ?? null,
  favorite: false,
});

/**
 * Normalizes one row of the `favorites` table back into a book.
 *
 * A favorites row stores a snapshot of the book plus a pointer to its origin.
 * Exactly one of `ol_key` / `book_id` is set — a database CHECK constraint
 * guarantees it — and which one tells us the original source. That matters
 * because it decides whether the details modal offers Update and Delete.
 *
 * `favorite` is hardcoded true: every row in this table is, by definition, a
 * bookmark.
 *
 * @param {object} row - A row from the `favorites` table.
 * @returns {object} A normalized book, with `source` inferred from the pointer.
 */
export const fromFavorite = (row) => ({
  source: row.ol_key ? "openlibrary" : "supabase",
  id: row.ol_key ?? row.book_id,
  title: row.title ?? "Untitled",
  image: row.image || null,
  authors: row.authors ?? [],
  subjects: row.subjects ?? [],
  publisher: row.publisher ?? "Unknown",
  isbn13: row.isbn13 ?? "",
  date_published: row.date_published ?? "Unknown",
  pages: row.pages ?? null,
  synopsis: row.synopsis ?? null,
  favorite: true,
});

/**
 * Converts a normalized book into a row for the `favorites` table.
 *
 * The book's metadata is *copied* rather than referenced. That duplication is
 * deliberate: Open Library allows roughly one request per second from a browser,
 * so rendering the favorites page by re-fetching each bookmarked work would cost
 * about a second per book. Snapshotting makes it a single query.
 *
 * The trade-off is staleness — editing one of your own books does not rewrite an
 * existing bookmark's snapshot.
 *
 * Note that `id` is omitted so the database assigns it, and `favorite` is not a
 * column here.
 *
 * @param {object} book - A normalized book from either source.
 * @returns {object} A row ready to insert, with exactly one of ol_key/book_id set.
 */
export const toFavoriteRow = (book) => ({
  ol_key: book.source === "openlibrary" ? book.id : null,
  book_id: book.source === "supabase" ? book.id : null,
  title: book.title,
  image: book.image,
  synopsis: book.synopsis,
  publisher: book.publisher,
  subjects: book.subjects,
  authors: book.authors,
  isbn13: book.isbn13,
  date_published: book.date_published,
  pages: book.pages,
});

/**
 * Which `favorites` column identifies this book, and the value to match on.
 *
 * Used to build the delete filter when un-bookmarking, so the caller does not
 * have to re-derive the ol_key/book_id split.
 *
 * @param {object} book - A normalized book.
 * @returns {{column: "ol_key"|"book_id", value: string|number}}
 */
export const favoriteMatch = (book) =>
  book.source === "openlibrary"
    ? { column: "ol_key", value: book.id }
    : { column: "book_id", value: book.id };
