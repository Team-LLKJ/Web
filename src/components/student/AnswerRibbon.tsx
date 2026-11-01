import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEditorState, type Editor } from "@tiptap/react";
import { CellSelection } from "@tiptap/pm/tables";
import { EditorToolIcon } from "./EditorToolIcon";
import { DEFAULT_FONT_SIZE } from "./answerHtml";

type Props = {
  editor: Editor;
  zoom: string;
  onZoom: (value: string) => void;
  onFind: () => void;
  onLink: () => void;
  onHelp: () => void;
};
const SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72, 96];
const STYLE_OPTIONS = [
  { value: "P", label: "일반 텍스트", fontSize: 13, fontWeight: 400 },
  { value: "H1", label: "제목 1", fontSize: 18, fontWeight: 700 },
  { value: "H2", label: "제목 2", fontSize: 16, fontWeight: 600 },
  { value: "H3", label: "제목 3", fontSize: 15, fontWeight: 500 },
];
const ALIGN_OPTIONS = [
  { value: "left", label: "왼쪽 정렬", icon: "alignLeft" },
  { value: "center", label: "가운데 정렬", icon: "alignCenter" },
  { value: "right", label: "오른쪽 정렬", icon: "alignRight" },
  { value: "justify", label: "양쪽 정렬", icon: "alignJustify" },
] as const;
const COLOR_GRID = [
  "#000000 #434343 #666666 #999999 #b7b7b7 #cccccc #d9d9d9 #efefef #f3f3f3 #ffffff",
  "#980000 #ff0000 #ff9900 #ffff00 #00ff00 #00ffff #4a86e8 #0000ff #9900ff #ff00ff",
  "#e6b8af #f4cccc #fce5cd #fff2cc #d9ead3 #d0e0e3 #c9daf8 #cfe2f3 #d9d2e9 #ead1dc",
  "#dd7e6b #ea9999 #f9cb9c #ffe599 #b6d7a8 #a2c4c9 #a4c2f4 #9fc5e8 #b4a7d6 #d5a6bd",
  "#cc4125 #e06666 #f6b26b #ffd966 #93c47d #76a5af #6d9eeb #6fa8dc #8e7cc3 #c27ba0",
  "#a61c00 #cc0000 #e69138 #f1c232 #6aa84f #45818e #3c78d8 #3d85c6 #674ea7 #a64d79",
  "#85200c #990000 #b45f06 #bf9000 #38761d #134f5c #1155cc #0b5394 #351c75 #741b47",
  "#5b0f00 #660000 #783f04 #7f6000 #274e13 #0c343d #1c4587 #073763 #20124d #4c1130",
].flatMap((row) => row.split(" "));
type MenuKey = "style" | "size" | "color" | "highlight" | "align" | "table" | "cell";
const TABLE_GRID_ROWS = 8;
const TABLE_GRID_COLS = 10;
type MenuState = { key: MenuKey; left: number; top: number };
function hexColor(value: string) {
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  const values = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  return values
    ? "#" +
        values
          .slice(1)
          .map((v) => Number(v).toString(16).padStart(2, "0"))
          .join("")
    : "#1c1c1e";
}
export function AnswerRibbon({
  editor,
  onLink,
}: Props) {
  const [sizeDraft, setSizeDraft] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [tableSize, setTableSize] = useState({ rows: 1, cols: 1 });
  const popover = useRef<HTMLDivElement>(null);
  const [contextTable, setContextTable] = useState<{ from: number; to: number } | null>(null);
  // 메뉴가 화면 아래로 잘리면 위로 끌어올린다.
  useLayoutEffect(() => {
    const el = popover.current;
    if (!menu || !el) return;
    const { height, bottom } = el.getBoundingClientRect();
    if (bottom > window.innerHeight - 8) {
      const top = Math.max(8, window.innerHeight - height - 8);
      if (top !== menu.top) setMenu({ ...menu, top });
    }
  }, [menu]);
  // 표 안에서 오른쪽 클릭하면 구글 문서처럼 표 편집 메뉴를 연다.
  useEffect(() => {
    const dom = editor.view.dom;
    // 오른쪽 클릭하면 에디터가 여러 셀 선택을 풀어 버리므로, 클릭 직전의 선택을 기억해 두었다가 복원한다.
    let savedCells: { anchor: number; head: number } | null = null;
    const onMouseDown = (event: MouseEvent) => {
      const sel = editor.state.selection;
      // Ctrl+클릭(맥의 오른쪽 클릭)과 오른쪽 클릭은 에디터가 처리하지 못하게 막아 선택을 그대로 둔다.
      if (
        sel instanceof CellSelection &&
        (event.ctrlKey || event.button === 2) &&
        (event.target as Element).closest("td, th")
      ) {
        event.stopPropagation();
      }
      savedCells =
        sel instanceof CellSelection
          ? { anchor: sel.$anchorCell.pos, head: sel.$headCell.pos }
          : null;
    };
    const onContext = (event: MouseEvent) => {
      const cell = (event.target as Element).closest("td, th");
      if (!cell || !editor.isEditable) return;
      event.preventDefault();
      // 오른쪽 클릭한 셀이 속한 표의 범위를 기억해 둔다 (표 삭제용).
      let found: { from: number; to: number } | null = null;
      try {
        const $pos = editor.state.doc.resolve(editor.view.posAtDOM(cell, 0));
        for (let d = $pos.depth; d > 0; d--) {
          if ($pos.node(d).type.name === "table") {
            found = { from: $pos.before(d), to: $pos.after(d) };
            break;
          }
        }
      } catch {
        found = null;
      }
      setContextTable(found);
      if (savedCells && !(editor.state.selection instanceof CellSelection)) {
        const { doc } = editor.state;
        try {
          editor.view.dispatch(
            editor.state.tr.setSelection(
              new CellSelection(
                doc.resolve(savedCells.anchor),
                doc.resolve(savedCells.head),
              ),
            ),
          );
        } catch {
          savedCells = null;
        }
      }
      const { selection } = editor.state;
      if (!(selection instanceof CellSelection)) {
        const pos = editor.view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        if (pos) editor.commands.setTextSelection(pos.pos);
      }
      setMenu({
        key: "cell",
        left: Math.min(event.clientX, window.innerWidth - 200),
        top: Math.max(8, event.clientY),
      });
    };
    dom.addEventListener("mousedown", onMouseDown, true);
    dom.addEventListener("contextmenu", onContext);
    return () => {
      dom.removeEventListener("mousedown", onMouseDown, true);
      dom.removeEventListener("contextmenu", onContext);
    };
  }, [editor]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onDown = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        popover.current?.contains(target) ||
        target.closest("[data-ribbon-trigger]")
      )
        return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    const onScroll = (event: Event) => {
      if (popover.current?.contains(event.target as Node)) return;
      close();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menu]);
  const openMenu = (key: MenuKey, anchor: HTMLElement, toggle = true) => {
    const rect = anchor.getBoundingClientRect();
    setMenu((current) =>
      current?.key === key && toggle
        ? null
        : { key, left: rect.left, top: rect.bottom + 6 },
    );
  };
  const pick = (action: () => void) => {
    action();
    setMenu(null);
  };
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      align:
        e.getAttributes("heading").textAlign ||
        e.getAttributes("paragraph").textAlign ||
        "left",
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      style: e.isActive("heading")
        ? `H${e.getAttributes("heading").level}`
        : "P",
      size:
        parseFloat(
          e.getAttributes("textStyle").fontSize ||
            e.getAttributes("paragraph").fontSize ||
            e.getAttributes("heading").fontSize,
        ) ||
        ({ 1: 24, 2: 20, 3: 18 }[
          e.getAttributes("heading").level as 1 | 2 | 3
        ] ??
          DEFAULT_FONT_SIZE),
      color: e.getAttributes("textStyle").color || "#1c1c1e",
      highlight: e.getAttributes("highlight").color || "#ffd4d3",
      table: e.isActive("table"),
      image: e.isActive("image"),
      imagePos: e.state.selection.from,
      imageWidth: e.getAttributes("image").width || "",
      imageAlt: e.getAttributes("image").alt || "",
      undo: e.can().undo(),
      redo: e.can().redo(),
      hasSelection: !e.state.selection.empty,
      headerRow: e.isActive("tableHeader"),
      merge: e.can().mergeCells(),
      split: e.can().splitCell(),
    }),
  });
  const run = (action: () => void) => {
    if (editor.isEditable) action();
  };
  const tool = (
    label: string,
    icon: ReactNode,
    action: () => void,
    active?: boolean,
    disabled = false,
    shortcut?: string,
  ) => (
    <button
      key={label}
      type="button"
      className={`ribbon-tool ${active ? "is-active" : ""}`}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => run(action)}
    >
      <span className="ribbon-tool-symbol" aria-hidden="true">
        {icon}
      </span>
      <span className="ribbon-tool-label">{label}</span>
    </button>
  );
  const divider = <span className="ribbon-divider" aria-hidden="true" />;
  function size(value: string, focus = true) {
    const number = Math.min(
      96,
      Math.max(8, Number(value) || DEFAULT_FONT_SIZE),
    );
    const chain = editor.chain();
    if (focus) chain.focus();
    chain
      .setFontSize(`${number}px`)
      .command(({ tr }) => {
        const { from, to } = tr.selection;
        tr.doc.nodesBetween(from, to, (node, pos) => {
          if (!["paragraph", "heading"].includes(node.type.name)) return;
          // A fully formatted paragraph must use the same font metrics as its text.
          if (from <= pos + 1 && to >= pos + 1 + node.content.size) {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              fontSize: `${number}px`,
            });
          }
        });
        return true;
      })
      .run();
    setSizeDraft(null);
  }
  return (
    <div className="answer-ribbon answer-ribbon--compact">
      <div className="ribbon-compact" role="toolbar" aria-label="서식 도구">
        {tool(
          "실행 취소",
          <EditorToolIcon name="undo" />,
          () => editor.chain().focus().undo().run(),
          undefined,
          !state.undo,
          "Ctrl/⌘ Z",
        )}
        {tool(
          "다시 실행",
          <EditorToolIcon name="redo" />,
          () => editor.chain().focus().redo().run(),
          undefined,
          !state.redo,
          "Ctrl/⌘ Shift Z",
        )}
        {divider}
        <button
          type="button"
          className="ribbon-select-trigger ribbon-style-trigger"
          data-ribbon-trigger
          aria-label="문단 스타일"
          aria-haspopup="menu"
          aria-expanded={menu?.key === "style"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => openMenu("style", e.currentTarget)}
        >
          <span>
            {STYLE_OPTIONS.find((o) => o.value === state.style)?.label ??
              "일반 텍스트"}
          </span>
          <span className="ribbon-caret" aria-hidden="true" />
        </button>
        <div className="ribbon-font-size">
          <button
            type="button"
            aria-label="글자 크기 줄이기"
            disabled={state.size <= 8}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => size(String(state.size - 1))}
          >
            <EditorToolIcon name="minus" />
          </button>
          <input
            aria-label="글자 크기"
            type="text"
            inputMode="decimal"
            value={sizeDraft ?? String(state.size)}
            onChange={(e) => setSizeDraft(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.select();
              openMenu("size", e.currentTarget.parentElement!, false);
            }}
            onBlur={() => {
              if (sizeDraft !== null) size(sizeDraft, false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                size(sizeDraft ?? String(state.size));
              } else if (e.key === "Escape") {
                setSizeDraft(null);
                editor.commands.focus();
              }
            }}
          />
          <span className="ribbon-font-unit" aria-hidden="true">
            px
          </span>
          <button
            type="button"
            aria-label="글자 크기 늘리기"
            disabled={state.size >= 96}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => size(String(state.size + 1))}
          >
            <EditorToolIcon name="plus" />
          </button>
        </div>
        {divider}
        {tool(
          "굵게",
          <b>B</b>,
          () => editor.chain().focus().toggleBold().run(),
          state.bold,
          false,
          "Ctrl/⌘ B",
        )}
        {tool(
          "기울임",
          <i>I</i>,
          () => editor.chain().focus().toggleItalic().run(),
          state.italic,
          false,
          "Ctrl/⌘ I",
        )}
        {tool(
          "밑줄",
          <u>U</u>,
          () => editor.chain().focus().toggleUnderline().run(),
          state.underline,
          false,
          "Ctrl/⌘ U",
        )}
        <button
          type="button"
          className="ribbon-tool"
          data-ribbon-trigger
          aria-label="글자 색상"
          title="글자 색"
          aria-haspopup="menu"
          aria-expanded={menu?.key === "color"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => openMenu("color", e.currentTarget)}
        >
          <span className="ribbon-tool-symbol">
            <span
              className="ribbon-text-color"
              style={{ borderBottomColor: state.color }}
            >
              A
            </span>
          </span>
        </button>
        <button
          type="button"
          className="ribbon-tool"
          data-ribbon-trigger
          aria-label="강조 색상"
          title="형광펜"
          aria-haspopup="menu"
          aria-expanded={menu?.key === "highlight"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => openMenu("highlight", e.currentTarget)}
        >
          <span className="ribbon-tool-symbol">
            <span
              className="ribbon-highlight"
              style={{ backgroundColor: state.highlight }}
            >
              A
            </span>
          </span>
        </button>
        {divider}
        <button
          type="button"
          className="ribbon-tool ribbon-tool--menu"
          data-ribbon-trigger
          aria-label="문단 정렬"
          title="정렬"
          aria-haspopup="menu"
          aria-expanded={menu?.key === "align"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => openMenu("align", e.currentTarget)}
        >
          <span className="ribbon-tool-symbol" aria-hidden="true">
            <EditorToolIcon
              name={
                ALIGN_OPTIONS.find((o) => o.value === state.align)?.icon ??
                "alignLeft"
              }
            />
          </span>
          <span className="ribbon-caret" aria-hidden="true" />
        </button>
        {tool(
          "글머리 기호",
          <EditorToolIcon name="list" />,
          () => editor.chain().focus().toggleBulletList().run(),
          state.bullet,
        )}
        {tool(
          "번호 목록",
          <EditorToolIcon name="numberList" />,
          () => editor.chain().focus().toggleOrderedList().run(),
          state.ordered,
        )}
        {tool(
          "체크리스트",
          <EditorToolIcon name="checklist" />,
          () => editor.chain().focus().toggleTaskList().run(),
          state.task,
        )}
        {tool("링크 넣기", <EditorToolIcon name="link" />, onLink)}
        <button
          type="button"
          className="ribbon-tool"
          data-ribbon-trigger
          aria-label="표 넣기"
          title="표 넣기"
          aria-haspopup="menu"
          aria-expanded={menu?.key === "table"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            setTableSize({ rows: 1, cols: 1 });
            run(() => openMenu("table", e.currentTarget));
          }}
        >
          <span className="ribbon-tool-symbol" aria-hidden="true">
            <EditorToolIcon name="table" />
          </span>
          <span className="ribbon-tool-label">표 넣기</span>
        </button>
      </div>
      {state.image && (
        <div
          className="ribbon-compact ribbon-context-row"
          role="toolbar"
          aria-label="이미지 도구"
        >
          {state.image && (
              <div className="ribbon-image-settings">
                <label>
                  너비
                  <input
                    key={`${state.imagePos}-${state.imageWidth}`}
                    aria-label="이미지 너비"
                    type="number"
                    min="80"
                    max="1600"
                    placeholder="자동"
                    defaultValue={state.imageWidth}
                    disabled={!state.image}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    onBlur={(e) => {
                      if (state.image && e.target.value)
                        editor
                          .chain()
                          .updateAttributes("image", {
                            width: Math.min(
                              1600,
                              Math.max(80, Number(e.target.value)),
                            ),
                            height: null,
                          })
                          .run();
                    }}
                  />
                </label>
                <label>
                  설명
                  <input
                    key={`${state.imagePos}-${state.imageAlt}`}
                    aria-label="이미지 설명"
                    maxLength={200}
                    defaultValue={state.imageAlt}
                    disabled={!state.image}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    onBlur={(e) => {
                      if (state.image)
                        editor
                          .chain()
                          .updateAttributes("image", { alt: e.target.value })
                          .run();
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!state.image}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor.chain().focus().deleteSelection().run()}
                >
                  이미지 삭제
                </button>
              </div>
          )}
        </div>
      )}
      {menu &&
        createPortal(
          <div
            ref={popover}
            className={`ribbon-popover ribbon-popover--${menu.key}`}
            role="menu"
            style={{ left: menu.left, top: menu.top }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {menu.key === "size" &&
              SIZE_OPTIONS.map((n) => (
                <button
                  type="button"
                  key={n}
                  role="menuitem"
                  className={n === state.size ? "is-selected" : ""}
                  onClick={() => pick(() => size(String(n)))}
                >
                  {n}
                </button>
              ))}
            {menu.key === "style" &&
              STYLE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  role="menuitemradio"
                  aria-checked={option.value === state.style}
                  className="ribbon-popover-style"
                  onClick={() =>
                    pick(() => {
                      if (option.value === "P")
                        editor.chain().focus().setParagraph().run();
                      else
                        editor
                          .chain()
                          .focus()
                          .setHeading({
                            level: Number(option.value.slice(1)) as 1 | 2 | 3,
                          })
                          .run();
                    })
                  }
                >
                  <span className="ribbon-check" aria-hidden="true">
                    {option.value === state.style ? "✓" : ""}
                  </span>
                  <span
                    style={{
                      fontSize: option.fontSize,
                      fontWeight: option.fontWeight,
                    }}
                  >
                    {option.label}
                  </span>
                </button>
              ))}
            {menu.key === "cell" && (
              <>
                {[
                  ["잘라내기", !state.hasSelection, () => document.execCommand("cut")],
                  ["복사", !state.hasSelection, () => document.execCommand("copy")],
                  [
                    "붙여넣기",
                    false,
                    () => {
                      void navigator.clipboard
                        .readText()
                        .then((text) => editor.chain().focus().insertContent(text).run())
                        .catch(() => undefined);
                    },
                  ],
                ].map(([label, disabled, action]) => (
                  <button
                    type="button"
                    key={label as string}
                    role="menuitem"
                    disabled={disabled as boolean}
                    onClick={() => pick(action as () => void)}
                  >
                    {label as string}
                  </button>
                ))}
                <hr />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    pick(() => editor.chain().focus().toggleHeaderRow().run())
                  }
                >
                  {state.headerRow ? "제목 행 해제" : "제목 행 삽입"}
                </button>
                <hr />
                {[
                  ["위에 행 1개 삽입", () => editor.chain().focus().addRowBefore().run()],
                  ["아래에 행 1개 삽입", () => editor.chain().focus().addRowAfter().run()],
                  ["왼쪽에 열 1개 삽입", () => editor.chain().focus().addColumnBefore().run()],
                  ["오른쪽에 열 1개 삽입", () => editor.chain().focus().addColumnAfter().run()],
                ].map(([label, action]) => (
                  <button
                    type="button"
                    key={label as string}
                    role="menuitem"
                    onClick={() => pick(action as () => void)}
                  >
                    {label as string}
                  </button>
                ))}
                <hr />
                {[
                  ["행 삭제", () => editor.chain().focus().deleteRow().run()],
                  ["열 삭제", () => editor.chain().focus().deleteColumn().run()],
                  [
                    "표 삭제",
                    () => {
                      const range = contextTable;
                      if (!range) {
                        editor.chain().focus().deleteTable().run();
                        return;
                      }
                      editor
                        .chain()
                        .focus()
                        .command(({ tr }) => {
                          tr.delete(range.from, range.to);
                          return true;
                        })
                        .run();
                    },
                  ],
                ].map(([label, action]) => (
                  <button
                    type="button"
                    key={label as string}
                    role="menuitem"
                    onClick={() => pick(action as () => void)}
                  >
                    {label as string}
                  </button>
                ))}
                <hr />
                <button
                  type="button"
                  role="menuitem"
                  disabled={!state.merge}
                  onClick={() => pick(() => editor.chain().focus().mergeCells().run())}
                >
                  셀 병합
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!state.split}
                  onClick={() => pick(() => editor.chain().focus().splitCell().run())}
                >
                  셀 나누기
                </button>
              </>
            )}
            {menu.key === "table" && (
              <div className="table-picker">
                <div
                  className="table-picker-grid"
                  onMouseLeave={() => setTableSize({ rows: 1, cols: 1 })}
                >
                  {Array.from({ length: TABLE_GRID_ROWS * TABLE_GRID_COLS }, (_, i) => {
                    const row = Math.floor(i / TABLE_GRID_COLS) + 1;
                    const col = (i % TABLE_GRID_COLS) + 1;
                    const on = row <= tableSize.rows && col <= tableSize.cols;
                    return (
                      <button
                        type="button"
                        key={i}
                        role="menuitem"
                        aria-label={`${row} x ${col} 표`}
                        className={on ? "is-on" : ""}
                        onMouseEnter={() => setTableSize({ rows: row, cols: col })}
                        onClick={() =>
                          pick(() =>
                            editor
                              .chain()
                              .focus()
                              .insertTable({ rows: row, cols: col, withHeaderRow: false })
                              .run(),
                          )
                        }
                      />
                    );
                  })}
                </div>
                <div className="table-picker-label">
                  {tableSize.cols} x {tableSize.rows}
                </div>
              </div>
            )}
            {menu.key === "align" &&
              ALIGN_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  role="menuitemradio"
                  aria-label={option.label}
                  title={option.label}
                  aria-checked={option.value === state.align}
                  className={option.value === state.align ? "is-selected" : ""}
                  onClick={() =>
                    pick(() =>
                      editor.chain().focus().setTextAlign(option.value).run(),
                    )
                  }
                >
                  <EditorToolIcon name={option.icon} />
                </button>
              ))}
            {(menu.key === "color" || menu.key === "highlight") && (
              <>
                {menu.key === "highlight" && (
                  <button
                    type="button"
                    className="ribbon-popover-none"
                    onClick={() =>
                      pick(() => editor.chain().focus().unsetHighlight().run())
                    }
                  >
                    없음
                  </button>
                )}
                <div className="ribbon-swatches" role="group">
                  {COLOR_GRID.map((color) => (
                    <button
                      type="button"
                      key={color}
                      aria-label={color}
                      title={color}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        pick(() => {
                          const chain = editor.chain().focus();
                          if (menu.key === "color") chain.setColor(color).run();
                          else chain.setHighlight({ color }).run();
                        })
                      }
                    />
                  ))}
                </div>
                <label className="ribbon-popover-custom">
                  <span>맞춤</span>
                  <input
                    type="color"
                    aria-label="맞춤 색상 선택"
                    value={hexColor(
                      menu.key === "color" ? state.color : state.highlight,
                    )}
                    onChange={(e) => {
                      const chain = editor.chain().focus();
                      if (menu.key === "color")
                        chain.setColor(e.target.value).run();
                      else chain.setHighlight({ color: e.target.value }).run();
                    }}
                  />
                </label>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
