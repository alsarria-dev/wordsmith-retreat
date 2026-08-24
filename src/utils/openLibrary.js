/**
 * @file Client for the Open Library REST API — the app's book catalogue.
 *
 * Open Library is a free, key-less public API. It supplies everything the app
 * reads that the user did not create themselves: the trending shelf, title
 * search, and full work descriptions.
 *
 * Two constraints shape this module:
 *
 * 1. **Rate limit.** Roughly 1 request/second for browser clients. The higher
 *    3 req/s tier requires an identifying `User-Agent` header, which browsers
 *    forbid scripts from setting — so it is unreachable from here. Callers
 *    debounce, and pass an AbortSignal so superseded requests are cancelled.
 * 2. **Latency.** Around 2 seconds per call, roughly flat regardless of how many
 *    results are requested. Fetching more per request is therefore much cheaper
 *    than fetching more often.
 *
 * Responses are raw API shapes; run them through `normalizeBook.js` before use.
 *
 * Exports: `searchBooks`, `getTrending`, `getWorkDescription`.
 *
 * @see https://openlibrary.org/developers/api
 */

const API_BASE = "https://openlibrary.org";
const DEFAULT_LIMIT = 48;

/**
 * Fields requested from search and trending endpoints.
 *
 * Open Library's default response omits most of these, which would force a
 * second request per book. Asking for them explicitly means one call returns
 * everything the app's book shape needs — except the synopsis, which only exists
 * on the work record (see `getWorkDescription`).
 *
 * Add a field here if you need it in `fromOpenLibrary`.
 */
const FIELDS = [
  "key",
  "title",
  "author_name",
  "cover_i",
  "isbn",
  "publisher",
  "subject",
  "number_of_pages_median",
  "first_publish_year",
  "first_sentence",
].join(",");

/**
 * Performs a GET against Open Library and parses the JSON body.
 *
 * @param {string} path - Path beginning with "/", appended to the API base.
 * @param {AbortSignal} [signal] - Cancels the request when the caller supersedes it.
 * @returns {Promise<object>} The parsed response body.
 * @throws {Error} On any non-2xx response, with the status in the message.
 * @throws {DOMException} Named "AbortError" when `signal` aborts. Callers are
 *   expected to swallow this — it means "superseded", not "failed".
 */
const request = async (path, signal) => {
  const response = await fetch(`${API_BASE}${path}`, { signal });
  if (!response.ok) {
    throw new Error(`Open Library request failed (${response.status})`);
  }
  return response.json();
};

/**
 * Searches the catalogue by title.
 *
 * Uses Open Library's `title=` parameter rather than the looser `q=`, so results
 * match on the title alone. That mirrors the Supabase `ilike("title", ...)`
 * query it runs alongside, keeping both halves of a merged search consistent.
 *
 * @param {string} query - The title to search for.
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - Cancels a superseded search.
 * @param {number} [options.limit=48] - Results to request.
 * @returns {Promise<object[]>} Raw search documents; `[]` if the response has none.
 * @throws {Error} On a non-2xx response.
 */
export const searchBooks = async (
  query,
  { signal, limit = DEFAULT_LIMIT } = {},
) => {
  const params = new URLSearchParams({
    title: query,
    fields: FIELDS,
    limit: String(limit),
  });
  const { docs } = await request(`/search.json?${params}`, signal);
  return docs ?? [];
};

/**
 * Fetches this week's trending works — what the shelf shows with no search term.
 *
 * Open Library has no "all books" endpoint, so browsing needs *some* query.
 * Trending was chosen because it accepts the same `fields` parameter as search
 * and returns the same document shape, meaning both paths normalize through
 * identical code.
 *
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - Cancels a superseded request.
 * @param {number} [options.limit=48] - Works to request.
 * @returns {Promise<object[]>} Raw work documents; `[]` if the response has none.
 * @throws {Error} On a non-2xx response.
 */
export const getTrending = async ({ signal, limit = DEFAULT_LIMIT } = {}) => {
  const params = new URLSearchParams({
    fields: FIELDS,
    limit: String(limit),
  });
  const { works } = await request(`/trending/weekly.json?${params}`, signal);
  return works ?? [];
};

/**
 * Fetches a work's full description.
 *
 * Descriptions are not included in search or trending responses — only on the
 * individual work record — so this is a second request, made on demand when the
 * details modal opens. That keeps it to one call per user click rather than one
 * per book on the shelf, which would blow through the rate limit instantly.
 *
 * Open Library returns `description` in two different shapes depending on the
 * record's age: either a plain string, or `{ type, value }`. Both are handled.
 *
 * @param {string} workKey - A work key that already includes the prefix,
 *   e.g. "/works/OL27448W" — exactly what `fromOpenLibrary` puts in `book.id`.
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - Cancels the request if the modal closes.
 * @returns {Promise<string|null>} The description, or null if the work has none.
 * @throws {Error} On a non-2xx response, e.g. an unknown work key.
 */
export const getWorkDescription = async (workKey, { signal } = {}) => {
  const { description } = await request(`${workKey}.json`, signal);
  if (!description) {
    return null;
  }
  return typeof description === "string"
    ? description
    : (description.value ?? null);
};
