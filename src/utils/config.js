/**
 * @file The app's single Supabase client instance.
 *
 * Supabase is the writable half of the data layer: it stores the books the user
 * creates (`books`) and their bookmarks (`favorites`). The read-only half is
 * Open Library — see `openLibrary.js`.
 *
 * Every module that touches the database imports this default export, so there
 * is exactly one client (and one connection pool) for the whole app.
 *
 * **Environment.** Both values come from Vite env vars and must be present at
 * *build* time — they are embedded into the bundle, not read at runtime, so
 * changing them requires a rebuild. See "Getting it running" in README.md.
 *
 * The key is the *publishable* (anon) key, which is designed to be public. Never
 * put the service role key here: it would ship to every visitor.
 *
 * **Security.** Because the app has no login, "the app" and "anyone holding this
 * key" are the same principal. The database's row level security policies grant
 * that principal full access, which is appropriate for a demo and not for real
 * user data.
 *
 * @see README.md — "Set up the database" has the full schema and policies.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// A missing .env surfaces here as a hard failure at startup rather than as
// confusing 401s later: createClient throws "supabaseUrl is required." or
// "supabaseKey is required." if either value is undefined. Seeing one of those
// in the console means the env vars did not reach the build.
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
