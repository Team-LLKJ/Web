import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./header-icons.css";
import { installTextareaAutoGrow } from "./lib/autoGrowTextarea";

installTextareaAutoGrow();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
