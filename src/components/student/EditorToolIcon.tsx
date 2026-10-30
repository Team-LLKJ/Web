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
      <path
        d="m10 13 4-4M8 15l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 9l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"
        transform="translate(0 -1)"
      />
    </>
  ),
};
export function EditorToolIcon({ name }: { name: ToolName }) {
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
