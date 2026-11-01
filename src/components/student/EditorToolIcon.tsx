import type { ReactNode } from "react";

type ToolName =
  | "search"
  | "undo"
  | "redo"
  | "previous"
  | "next"
  | "plus"
  | "minus"
  | "link"
  | "clear"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "alignJustify"
  | "list"
  | "numberList"
  | "outdent"
  | "indent"
  | "lineSpacing"
  | "table"
  | "addRow"
  | "addColumn"
  | "checklist"
  | "image"
  | "divider"
  | "symbol";
const paths: Record<ToolName, ReactNode> = {
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8" cy="8" r="2" />
      <path d="m3 17 5-5 4 4 4-6 5 7" />
    </>
  ),
  divider: (
    <>
      <path d="M3 12h18M7 5h10M7 19h10" />
      <path d="m10 2 2 3 2-3M10 22l2-3 2 3" />
    </>
  ),
  symbol: (
    <>
      <path d="M5 19h5v-2a7 7 0 1 1 4 0v2h5" />
    </>
  ),

  clear: (
    <>
      <path d="M4 5h12M10 5l-3 14M15 13l6 6M21 13l-6 6" />
    </>
  ),
  alignLeft: <path d="M4 5h16M4 10h11M4 15h16M4 20h11" />,
  alignCenter: <path d="M4 5h16M7 10h10M4 15h16M7 20h10" />,
  alignRight: <path d="M4 5h16M9 10h11M4 15h16M9 20h11" />,
  alignJustify: <path d="M4 5h16M4 10h16M4 15h16M4 20h16" />,
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4" cy="6" r=".8" />
      <circle cx="4" cy="12" r=".8" />
      <circle cx="4" cy="18" r=".8" />
    </>
  ),
  numberList: (
    <>
      <path d="M10 6h10M10 12h10M10 18h10M3 3h1v5M3 8h3M3 13c0-3 4-3 3 0l-3 5h3" />
    </>
  ),
  outdent: (
    <>
      <path d="M4 4h16M4 20h16M11 9h9M11 15h9M7 9l-4 3 4 3" />
    </>
  ),
  indent: (
    <>
      <path d="M4 4h16M4 20h16M11 9h9M11 15h9M3 9l4 3-4 3" />
    </>
  ),
  lineSpacing: (
    <>
      <path d="M11 6h9M11 12h9M11 18h9M5 4v16M2 7l3-3 3 3M2 17l3 3 3-3" />
    </>
  ),
  table: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M3 9h18M3 14h18M9 4v16M15 4v16" />
    </>
  ),
  addRow: (
    <>
      <rect x="3" y="3" width="18" height="11" rx="1" />
      <path d="M3 8h18M9 3v11M15 3v11M7 20h10M12 16v8" />
    </>
  ),
  addColumn: (
    <>
      <rect x="3" y="3" width="11" height="18" rx="1" />
      <path d="M3 9h11M3 15h11M8 3v18M20 7v10M16 12h8" />
    </>
  ),
  checklist: (
    <>
      <rect x="3" y="4" width="7" height="7" rx="1" />
      <path d="m5 7 1 1 2-2M14 7h7M14 17h7" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </>
  ),

  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  undo: (
    <>
      <path d="m8 4-4 4 4 4" />
      <path d="M4 8h10a6 6 0 0 1 0 12h-3" />
    </>
  ),
  redo: (
    <>
      <path d="m16 4 4 4-4 4" />
      <path d="M20 8H10a6 6 0 0 0 0 12h3" />
    </>
  ),
  previous: <path d="m14 6-6 6 6 6" />,
  next: <path d="m10 6 6 6-6 6" />,
  plus: <path d="M5 12h14M12 5v14" />,
  minus: <path d="M5 12h14" />,
  link: (
    <>
      <path d="M9 17H7a5 5 0 0 1 0-10h2" />
      <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
      <path d="M8 12h8" />
    </>
  ),
};
/* Google Docs-style filled glyphs (Material Icons, Apache-2.0), 24px grid. */
const MATERIAL: Partial<Record<ToolName, string>> = {
  undo: "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z",
  redo: "M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z",
  link: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
  image: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
  checklist: "M22 7h-9v2h9V7zm0 8h-9v2h9v-2zM5.54 11L2 7.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L5.54 11zm0 8L2 15.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L5.54 19z",
  list: "M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z",
  numberList: "M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z",
  alignLeft: "M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z",
  alignCenter: "M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z",
  alignRight: "M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z",
  alignJustify: "M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z",
  table: "M10 10.02h5V21h-5zM17 21h3c1.1 0 2-.9 2-2v-9h-5v11zm3-18H5c-1.1 0-2 .9-2 2v3h19V5c0-1.1-.9-2-2-2zM3 19c0 1.1.9 2 2 2h3V10H3v9z",
};
export function EditorToolIcon({ name }: { name: ToolName }) {
  const glyph = MATERIAL[name];
  if (glyph)
    return (
      <svg
        className="editor-tool-icon"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d={glyph} />
      </svg>
    );
  return (
    <svg
      className="editor-tool-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
