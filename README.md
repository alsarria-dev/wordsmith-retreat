# Wordsmith Retreat 📚

[![Status](https://img.shields.io/badge/Status-Active-brightgreen)](https://github.com/alvsarria/project2) [![License](https://img.shields.io/badge/License-MIT-blue)](./LICENSE) [![HTML5](https://img.shields.io/badge/HTML5-E34C26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5) [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript) [![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS) [![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev) [![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev) [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)

**Wordsmith Retreat** is a small React application that serves as a personal library / bookmark manager for books. The app lets users browse, search, bookmark (favorite), add, update and delete books stored in a Supabase database. It uses modern React + Vite tooling and client-side routing for a smooth user experience.

---

## 🚀 Logo

<img src="./src/assets/images/logo_books.png" width="200">

> Note: This project includes a Vercel configuration (see `vercel.json`) for static rewrites. If you plan to deploy, you can use Vercel, Netlify, or any static host that supports SPA rewrites.

---

## ✨ Features

- Browse a list of books (paginated locally / limited by query)
- Search books by title (case-insensitive)
- Mark/unmark favorites (bookmark icon)
- View book details in a modal (including title, author, publisher, pages, synopsis)
- Add new books via a form
- Update and delete existing books
- Simple loading state and client-side routing

---

## 🧩 Tech Stack

- Frontend: **React** (with hooks) + **React Router**
- Build tool: **Vite**
- Database / Backend-as-a-Service: **Supabase** (@supabase/supabase-js)
- HTTP / utilities: **axios** (present in deps)
- Formatting & linting: **Prettier**, **ESLint**

Key dependencies (see `package.json`):

- react, react-dom, react-router-dom
- @supabase/supabase-js
- axios
- vite, @vitejs/plugin-react
- prettier, eslint

---

## ⚙️ Project Structure (important files)

- `index.html` - App entry
- `src/main.jsx` - React root and Router
- `src/App.jsx` - Routes and top-level state (search, active page)
- `src/pages/*` - Per-page components: `HomePage`, `AllBooksPage`, `FavoritesPage`, `AddBookPage`
- `src/components/*` - Reusable UI: `Header`, `Footer`, `BookCard`, `DetailsBook`, `UpdateBook`, `Loading`, `SubmitFormOutput`
- `src/utils/config.js` - Supabase client initializer (reads env vars)
- `src/styles/` - App styles (organized by pages/components)
- `vercel.json` - SPA rewrite for Vercel (optional)

---

## 🛠️ Local Setup / Development

Prerequisites:

- Node.js (>= 16 recommended)
- npm or yarn

Steps:

1. Clone the repo

   ```bash
   git clone <repo-url>
   cd wordsmith-retreat
   ```

2. Install dependencies

   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env` file in the project root (or set environment variables in your host)

   Required variables:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` — your Supabase public/anon key

   Example `.env`:

   ```env
   VITE_SUPABASE_URL=https://xyzcompany.supabase.co
   VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=public-anon-key
   ```

4. Run the dev server

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Build / Preview

   ```bash
   npm run build
   npm run preview
   ```

---

## 🗄️ Supabase Table Schema (recommended)

The app uses a `books` table. A recommended schema that matches the fields used by the app:

- `id` (integer | primary key) — current code sometimes sends its own id; recommended to use DB-generated serial id
- `title` (text)
- `image` (text) — URL to cover image
- `synopsis` (text)
- `publisher` (text)
- `subjects` (text[]) — or text (CSV) depending on DB column type
- `authors` (text[]) — similarly
- `isbn13` (text)
- `date_published` (text)
- `pages` (integer)
- `favorite` (boolean) — default false

Notes:

- The client currently generates a random id when adding entries (see `AddBookPage`), but it's cleaner to let Supabase assign IDs (serial primary key) — if you change this, remove the client-side id generation.
- Arrays can be stored as Postgres text[] (native to Supabase) or as JSON/text depending on how you plan to query them.

---

## 📋 Scripts (from `package.json`)

- `npm run dev` — start development server
- `npm run build` — produce a production build
- `npm run preview` — preview the build locally
- `npm run lint` — run ESLint
- `npm run pretty` — run Prettier

---

## ♻️ Contributing

- Open an issue or pull request
- Keep changes small and focused
- Run linting and formatting before opening a PR (`npm run lint`, `npm run pretty`)

---

## 👤 Author

**Alvaro Sarria Rico**

- GitHub: https://github.com/alsarria-dev
- LinkedIn: https://www.linkedin.com/in/alsarria-dev/

---

## 🏷️ License

This repository does include an explicit license file. Edit `LICENSE` file if you want to clarify reuse terms.

---
