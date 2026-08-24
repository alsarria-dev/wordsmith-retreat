/**
 * @file Application entry point — the first of our code the browser runs.
 *
 * Referenced by index.html, mounts React into #root, and wraps the app in the
 * two providers it needs:
 *
 * - `StrictMode` — development-only checks. Note it **double-invokes effects**,
 *   so in dev you will see every fetch fire twice with the first aborted. That
 *   is expected, and is why the fetch effects carry AbortControllers.
 * - `BrowserRouter` — real URL paths rather than hashes, which is why static
 *   hosting needs the rewrite rule in vercel.json.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);
