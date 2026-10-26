import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// A fresh development server starts with clean demo data; reloads keep this run.
const devSessionId = import.meta.env.VITE_DEV_SESSION_ID;
if (import.meta.env.DEV && devSessionId) {
  try {
    if (localStorage.getItem("lit:dev-session-id") !== devSessionId) {
      Object.keys(localStorage)
        .filter((key) => key.startsWith("lit:"))
        .forEach((key) => localStorage.removeItem(key));
      localStorage.setItem("lit:dev-session-id", devSessionId);
    }
  } catch {
    // The app still works when browser storage is unavailable.
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
