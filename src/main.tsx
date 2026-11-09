import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./header-icons.css";
import { installTextareaAutoGrow } from "./lib/autoGrowTextarea";

installTextareaAutoGrow();

// 설치 가능한 웹앱(PWA): 배포 빌드에서만 서비스 워커를 등록합니다.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
