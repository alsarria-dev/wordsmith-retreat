/**
 * @file Vite build and dev-server configuration.
 *
 * Deliberately minimal — the React plugin is all this project needs. It provides
 * JSX transformation and Fast Refresh (hot reload that preserves component
 * state).
 *
 * Worth knowing even though nothing is configured here:
 *
 * - **Env vars.** Vite exposes only variables prefixed `VITE_` to client code,
 *   via `import.meta.env`. They are inlined at *build* time, so changing one
 *   requires a rebuild. Vite loads `.env`, and `.env.local` overrides it.
 * - **Asset imports.** Importing an image returns a URL string and gets the file
 *   hashed and copied into `dist/assets/`.
 * - **Dev port.** Defaults to 5173, and silently increments if that is taken —
 *   so check the URL Vite prints rather than assuming.
 *
 * @see https://vitejs.dev/config/
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
