// Generate the pre-React fallback from the same components and route resolver.
// Run after editing screen skeletons: node scripts/generate-loading.mjs
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile, writeFile } from "node:fs/promises";

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { PageLoading } = await server.ssrLoadModule(
    "/src/components/ui/PageLoading.tsx",
  );
  const { getLoadingLayout } = await server.ssrLoadModule(
    "/src/components/ui/loadingLayout.ts",
  );
  const layouts = [
    "list",
    "folder",
    "lobby",
    "form",
    "edit",
    "assessment-edit",
    "results",
    "grading",
    "neutral",
    "plain",
  ];
  const templates = layouts
    .map(
      (layout) =>
        `<!-- prettier-ignore -->
<template id="loading-${layout}">${renderToStaticMarkup(createElement(PageLoading, { layout }))}</template>`,
    )
    .join("\n");
  const startup = `${templates}\n<script>\n(() => {\nconst getLoadingLayout = ${getLoadingLayout.toString()};\nconst layout = getLoadingLayout(location.pathname);\nconst template = document.getElementById("loading-" + layout);\nif (template) document.getElementById("root").replaceChildren(template.content.cloneNode(true));\nif (layout === "folder") {\ntry {\nconst folderId = decodeURIComponent(location.pathname.split("/").filter(Boolean)[2] || "");\nconst shared = JSON.parse(localStorage.getItem("lit:shared-folder-ids") || "[]");\nif (shared.map(String).includes(folderId)) document.querySelectorAll("#root .folder-skeleton-delete").forEach((node) => node.remove());\n} catch (error) {}\n}\nif (layout === "list" && new URLSearchParams(location.search).get("tab") === "shared") {\nconst tabs = document.querySelectorAll("#root .segment-tabs.is-static button");\ntabs.forEach((button, index) => button.classList.toggle("active", index === 1));\n}\n})();\n</script>`;
  const path = new URL("../index.html", import.meta.url);
  const html = await readFile(path, "utf8");
  await writeFile(
    path,
    html.replace(
      /<!-- loading:start -->[\s\S]*?<!-- loading:end -->/,
      `<!-- loading:start -->\n${startup}\n<!-- loading:end -->`,
    ),
  );
} finally {
  await server.close();
}
