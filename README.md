# Wordsmith Retreat 📚

[![Status](https://img.shields.io/badge/Status-Active-brightgreen)](https://github.com/alvsarria/project2) [![License](https://img.shields.io/badge/License-MIT-blue)](./LICENSE) [![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev) [![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev) [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com) [![Open Library](https://img.shields.io/badge/Open_Library-8A6A4B?style=flat)](https://openlibrary.org/developers/api)

A personal library app. Search the public [Open Library](https://openlibrary.org)
catalogue, bookmark the books worth keeping, and add, edit and delete books of
your own — all on one shelf.

<img src="./src/assets/images/logo_books.png" width="180">

**New here? Read this file to get it running, then read
[`ARCHITECTURE.md`](./ARCHITECTURE.md) to understand how it works.**

---

## Where the books come from

The single most important thing to know about this codebase: it reads from **two
sources at once** and merges them onto one shelf.

| Source                                                 | Provides                                                                | Writable                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------- |
| [Open Library](https://openlibrary.org/developers/api) | Browsing (weekly trending) and title search across the public catalogue | **No** — read-only public API |
| Supabase (Postgres)                                    | Books you create, and your bookmarks                                    | **Yes**                       |

Your own books are listed first, then catalogue results. If one source is down
the shelf still renders the other and shows a notice.

Open Library needs no API key, but it is rate limited to roughly **1 request per
second** for browser clients — the higher tier requires a custom `User-Agent`,
which browsers do not allow. Searches are therefore debounced, and superseded
requests are aborted.

---

## Features

- Browse Open Library's weekly trending books alongside your own library
- Search by title across both sources at once
- Bookmark any book — a bookmarked catalogue book is saved to your own shelf
- View details in a modal, with the full synopsis fetched on demand
- Add your own books, with inline validation and duplicate detection
- Edit and delete books you created (catalogue books are read-only)
- Light and dark themes, following your OS by default
- Loading, empty, error and partial-outage states throughout

---

## Prerequisites

- **Node.js `^20.19` or `^22.13` or `>=24`** — the strictest constraint across the
  toolchain. Vite 8 accepts `^20.19 || >=22.12`; ESLint 10 narrows the 22.x line
  to `22.13`.
- **npm** (ships with Node)
- **A Supabase project** — free tier is fine. You need its URL and publishable
  (anon) key.

Verify your Node version:

```bash
node --version
```

---

## Getting it running

### 1. Install

```bash
git clone <repo-url>
cd wordsmith-retreat
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your Supabase project's values:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-anon-key
```

Both are in your Supabase dashboard under **Project Settings → API**.

> Vite only exposes variables prefixed with `VITE_` to the browser, and they are
> **embedded in the built bundle** — never put a secret key here. The publishable
> key is designed to be public; the service role key is not.

> Vite also reads `.env.local`, which takes priority over `.env`. Both are
> gitignored. If your settings seem to be ignored, check whether a `.env.local`
> is overriding them.

### 3. Set up the database

The app needs two tables, `books` and `favorites`, plus row level security
policies that let the browser write to them. Run the following once in your
Supabase dashboard → **SQL Editor**.

This is the whole schema — there is no migration tooling in this project, and
nothing in `package.json` touches the database.

```sql
begin;

-- Books the user creates in the app.
create table public.books (
  id             bigint primary key,
  title          text,
  image          text,
  synopsis       text,
  publisher      text,
  subjects       text[],
  authors        text[],
  isbn13         text,
  date_published text,
  pages          integer,
  favorite       boolean default false  -- legacy, no longer read or written
);

-- The bookmark shelf. Exactly one of ol_key / book_id is set per row:
--   ol_key  -> an Open Library work, e.g. '/works/OL27448W'
--   book_id -> a row in `books`
-- The remaining columns snapshot the book so this page renders in one query
-- rather than one Open Library request per bookmark.
create table public.favorites (
  id             bigint generated by default as identity primary key,
  ol_key         text unique,
  book_id        bigint unique references public.books (id) on delete cascade,
  title          text not null,
  image          text,
  authors        text[] not null default '{}',
  subjects       text[] not null default '{}',
  publisher      text,
  isbn13         text,
  date_published text,
  pages          integer,
  synopsis       text,
  created_at     timestamptz not null default now(),
  constraint favorites_exactly_one_source
    check (num_nonnulls(ol_key, book_id) = 1)
);

create index favorites_book_id_idx on public.favorites (book_id);

-- Row level security.
--
-- Without these policies every insert fails with Postgres error 42501
-- ("new row violates row-level security policy") and the UI appears to do
-- nothing — no error, just a dead button. Do not skip this step.
alter table public.books     enable row level security;
alter table public.favorites enable row level security;

create policy "books anon full access" on public.books
  for all to anon, authenticated
  using (true) with check (true);

create policy "favorites anon full access" on public.favorites
  for all to anon, authenticated
  using (true) with check (true);

commit;
```

> ⚠️ Those policies grant the `anon` role full access. The app has no login and
> its publishable key ships in the client bundle, so "the app" and "anyone
> holding that key" are the same principal. That is fine for a demo and **not**
> for real user data — adding Supabase Auth and scoping the policies to
> `auth.uid()` is the fix.

See [Database schema](#database-schema) below for what each column is for, and
[`ARCHITECTURE.md`](./ARCHITECTURE.md) §4 for why `favorites` is a separate table
rather than a flag on `books`.

### 4. Run it

```bash
npm run dev
```

Open the URL it prints (usually <http://localhost:5173>).

---

## Scripts

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start the Vite dev server with hot reload |
| `npm run build`   | Produce a production build in `dist/`     |
| `npm run preview` | Serve the production build locally        |
| `npm run lint`    | Run ESLint — must pass with zero warnings |
| `npm run pretty`  | Format all source files with Prettier     |

**There is no test suite in this repo.** `npm run lint && npm run build` is the
current definition of "nothing is broken".

---

## Project structure

```
wordsmith-retreat/
├── index.html          Vite entry HTML: font loading, pre-paint theme script
├── vite.config.js      Vite config (React plugin only)
├── eslint.config.js    ESLint 10 flat config
├── vercel.json         SPA rewrite so client-side routes work on a static host
├── public/             Served as-is at the site root
└── src/
    ├── main.jsx        Entry point: mounts React inside StrictMode + Router
    ├── App.jsx         Routes, plus the state shared across pages
    ├── index.css       Global reset, base typography, imports the tokens
    ├── pages/          One component per route
    ├── components/     Reusable UI (cards, modals, header, footer)
    ├── utils/          Data layer: API clients and normalization
    ├── styles/         All CSS. tokens.css is the design system
    └── assets/         Images
```

| Directory         | One-line description                                                         |
| ----------------- | ---------------------------------------------------------------------------- |
| `src/pages/`      | Route-level components. Each owns its own fetching and page state.           |
| `src/components/` | Presentational and interactive UI, driven entirely by props.                 |
| `src/utils/`      | Talks to Supabase and Open Library, and normalizes both into one book shape. |
| `src/styles/`     | Design tokens plus one stylesheet per page/component.                        |

---

## Database schema

### `books` — books you create

| Column                                                                | Type    | Notes                                                              |
| --------------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| `id`                                                                  | bigint  | Primary key. Currently generated **client-side** in `AddBookPage`. |
| `title`, `image`, `synopsis`, `publisher`, `isbn13`, `date_published` | text    |                                                                    |
| `subjects`, `authors`                                                 | text[]  | Postgres arrays.                                                   |
| `pages`                                                               | integer |                                                                    |
| `favorite`                                                            | boolean | **Unused.** Bookmarks live in `favorites` now.                     |

### `favorites` — the bookmark shelf

Exactly one of these two is set per row, enforced by a `CHECK` constraint:

| Column    | Type           | Notes                                            |
| --------- | -------------- | ------------------------------------------------ |
| `ol_key`  | text, unique   | An Open Library work key, e.g. `/works/OL27448W` |
| `book_id` | bigint, unique | Foreign key to `books.id`, `on delete cascade`   |

The remaining columns (`title`, `image`, `authors`, `subjects`, `publisher`,
`isbn13`, `date_published`, `pages`, `synopsis`) **snapshot** the book so the
favorites page renders in one query rather than one Open Library request per
bookmark. The trade-off: editing one of your own books does not update an
existing bookmark's snapshot.

---

## Deploying

Deployment is **manual, to Vercel** — there is no Git integration or CI pipeline
wired up, so nothing ships until someone runs a deploy.

```bash
npm install -g vercel   # once
vercel                  # deploy a preview
vercel --prod           # promote to production
```

Two things to get right:

- **Environment variables must be set in Vercel**, under Project Settings →
  Environment Variables: `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. Vite inlines them at **build** time,
  not run time, so changing one means redeploying — editing it in the dashboard
  alone changes nothing.
- **`vercel.json` is what makes routing work.** It rewrites every path to
  `index.html`, so visiting `/favorites` directly (or refreshing there) resolves
  instead of 404ing. Any other static host needs an equivalent SPA rewrite rule.

The build output is a plain static site in `dist/`, so nothing here is
Vercel-specific beyond that rewrite.

---

## Where to go next

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — how the system fits together: layers,
  the lifecycle of a search and of a bookmark, the design decisions behind them,
  and a "where do I look if I want to change X" table.

---

## Contributing

- Keep changes small and focused.
- Run `npm run lint` and `npm run pretty` before opening a PR.
- All colours, spacing and type must come from tokens in `src/styles/tokens.css` —
  no hard-coded values in component stylesheets.

---

## Author

**Alvaro Sarria Rico** — [GitHub](https://github.com/alsarria-dev) ·
[LinkedIn](https://www.linkedin.com/in/alsarria-dev/)

## License

MIT — see [`LICENSE`](./LICENSE).
