import { useId, useState, type ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { EditorToolIcon } from "./EditorToolIcon";
import { DEFAULT_FONT_SIZE, FONT_FAMILIES } from "./answerHtml";

type Props = {
  editor: Editor;
  imageBusy: boolean;
  zoom: string;
  onZoom: (value: string) => void;
  onFind: () => void;
  onLink: () => void;
  onTable: () => void;
  onImage: () => void;
  onHelp: () => void;
};
function hexColor(value: string) {
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  const values = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  return values
    ? "#" +
        values
          .slice(1)
          .map((v) => Number(v).toString(16).padStart(2, "0"))
          .join("")
    : "#202124";
}
export function AnswerRibbon({
  editor,
  imageBusy,
  zoom,
  onZoom,
  onFind,
  onLink,
  onTable,
  onImage,
  onHelp,
}: Props) {
  const [page, setPage] = useState(0);
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const [sizeDraft, setSizeDraft] = useState<string | null>(null);
  const sizeList = useId();
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      sup: e.isActive("superscript"),
      sub: e.isActive("subscript"),
      align:
        e.getAttributes("heading").textAlign ||
        e.getAttributes("paragraph").textAlign ||
        "left",
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      style: e.isActive("heading")
        ? `H${e.getAttributes("heading").level}`
        : "P",
      font: e.getAttributes("textStyle").fontFamily || "Arial",
      size:
        parseFloat(
          e.getAttributes("textStyle").fontSize ||
            e.getAttributes("paragraph").fontSize ||
            e.getAttributes("heading").fontSize,
        ) ||
        ({ 1: 36, 2: 30, 3: 24 }[
          e.getAttributes("heading").level as 1 | 2 | 3
        ] ??
          DEFAULT_FONT_SIZE),
      color: e.getAttributes("textStyle").color || "#202124",
      highlight: e.getAttributes("highlight").color || "#fff2cc",
      line:
        e.getAttributes("heading").paragraphLineHeight ||
        e.getAttributes("paragraph").paragraphLineHeight ||
        "1.5",
      before:
        e.getAttributes("heading").spacingBefore ||
        e.getAttributes("paragraph").spacingBefore ||
        0,
      after:
        e.getAttributes("heading").spacingAfter ||
        e.getAttributes("paragraph").spacingAfter ||
        0,
      table: e.isActive("table"),
      image: e.isActive("image"),
      imagePos: e.state.selection.from,
      imageWidth: e.getAttributes("image").width || "",
      imageAlt: e.getAttributes("image").alt || "",
      undo: e.can().undo(),
      redo: e.can().redo(),
      merge: e.can().mergeCells(),
      split: e.can().splitCell(),
    }),
  });
  const pages = ["편집", "문단", "삽입", "표·이미지"];
  const lineOptions = ["1", "1.15", "1.5", "1.75", "2", "2.5", "3"];
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
  const group = (label: string, children: ReactNode) => (
    <div className="ribbon-group">
      <div className="ribbon-group-tools">{children}</div>
      <span className="ribbon-group-caption">{label}</span>
    </div>
  );
  const paragraph = (attrs: Record<string, unknown>) =>
    editor
      .chain()
      .focus()
      .updateAttributes("paragraph", attrs)
      .updateAttributes("heading", attrs)
      .run();
  function indent(direction: number) {
    const item = editor.isActive("taskItem") ? "taskItem" : "listItem";
    if (editor.isActive(item)) {
      if (direction > 0) editor.chain().focus().sinkListItem(item).run();
      else editor.chain().focus().liftListItem(item).run();
      return;
    }
    const type = editor.isActive("heading") ? "heading" : "paragraph";
    paragraph({
      indent: Math.max(
        0,
        Math.min(6, Number(editor.getAttributes(type).indent || 0) + direction),
      ),
    });
  }
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
    <div className="answer-ribbon">
      <div className="ribbon-menu" aria-label="서식 메뉴">
        <div className="ribbon-menu-tabs">
          {pages.map((label, index) => (
            <button
              type="button"
              key={label}
              aria-pressed={page === index}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setPage(index)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ribbon-pagination">
          <button type="button" aria-label="편집 단축키 안내" onClick={onHelp}>
            ⌨
          </button>
          <span>
            {page + 1} / {pages.length}
          </span>
          <button
            type="button"
            aria-label="이전 서식 도구"
            disabled={page === 0}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPage((p) => p - 1)}
          >
            <EditorToolIcon name="previous" />
          </button>
          <button
            type="button"
            aria-label="다음 서식 도구"
            disabled={page === pages.length - 1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPage((p) => p + 1)}
          >
            <EditorToolIcon name="next" />
          </button>
        </div>
      </div>
      <div
        className="ribbon-tools"
        role="toolbar"
        aria-label={`${pages[page]} 도구`}
      >
        <div className="ribbon-page" hidden={page !== 0}>
          {group(
            "편집",
            <>
              {tool(
                "찾기·바꾸기",
                <EditorToolIcon name="search" />,
                onFind,
                undefined,
                false,
                "Ctrl/⌘ F",
              )}
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
            </>,
          )}
          {group(
            "글자 모양",
            <>
              {tool(
                "굵게",
                <b>가</b>,
                () => editor.chain().focus().toggleBold().run(),
                state.bold,
                false,
                "Ctrl/⌘ B",
              )}
              {tool(
                "기울임",
                <i>가</i>,
                () => editor.chain().focus().toggleItalic().run(),
                state.italic,
                false,
                "Ctrl/⌘ I",
              )}
              {tool(
                "밑줄",
                <u>가</u>,
                () => editor.chain().focus().toggleUnderline().run(),
                state.underline,
                false,
                "Ctrl/⌘ U",
              )}
              {tool(
                "취소선",
                <s>가</s>,
                () => editor.chain().focus().toggleStrike().run(),
                state.strike,
              )}
              {tool(
                "위 첨자",
                <span>
                  x<sup>2</sup>
                </span>,
                () => editor.chain().focus().toggleSuperscript().run(),
                state.sup,
              )}
              {tool(
                "아래 첨자",
                <span>
                  x<sub>2</sub>
                </span>,
                () => editor.chain().focus().toggleSubscript().run(),
                state.sub,
              )}
            </>,
          )}
          {group(
            "색상",
            <>
              <label className="ribbon-tool ribbon-color">
                <span className="ribbon-tool-symbol">
                  <span
                    className="ribbon-text-color"
                    style={{ borderBottomColor: state.color }}
                  >
                    가
                  </span>
                </span>
                <span className="ribbon-tool-label">글자 색</span>
                <input
                  aria-label="글자 색상"
                  type="color"
                  value={hexColor(state.color)}
                  onChange={(e) =>
                    editor.chain().focus().setColor(e.target.value).run()
                  }
                />
              </label>
              <label className="ribbon-tool ribbon-color">
                <span className="ribbon-tool-symbol">
                  <span
                    className="ribbon-highlight"
                    style={{ backgroundColor: state.highlight }}
                  >
                    가
                  </span>
                </span>
                <span className="ribbon-tool-label">형광펜</span>
                <input
                  aria-label="강조 색상"
                  type="color"
                  value={hexColor(state.highlight)}
                  onChange={(e) =>
                    editor
                      .chain()
                      .focus()
                      .setHighlight({ color: e.target.value })
                      .run()
                  }
                />
              </label>
            </>,
          )}
          {group(
            "서식",
            tool("서식 지우기", <EditorToolIcon name="clear" />, () =>
              editor
                .chain()
                .focus()
                .unsetAllMarks()
                .clearNodes()
                .resetAttributes("paragraph", "fontSize")
                .resetAttributes("heading", "fontSize")
                .run(),
            ),
          )}
        </div>
        <div className="ribbon-page" hidden={page !== 1}>
          {group(
            "문단 정렬",
            <>
              {(["left", "center", "right", "justify"] as const).map(
                (align, index) =>
                  tool(
                    ["왼쪽 정렬", "가운데 정렬", "오른쪽 정렬", "양쪽 정렬"][
                      index
                    ],
                    <EditorToolIcon
                      name={
                        (
                          [
                            "alignLeft",
                            "alignCenter",
                            "alignRight",
                            "alignJustify",
                          ] as const
                        )[index]
                      }
                    />,
                    () => editor.chain().focus().setTextAlign(align).run(),
                    state.align === align,
                  ),
              )}
            </>,
          )}
          {group(
            "목록 및 들여쓰기",
            <>
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
              {tool("내어쓰기", <EditorToolIcon name="outdent" />, () =>
                indent(-1),
              )}
              {tool("들여쓰기", <EditorToolIcon name="indent" />, () =>
                indent(1),
              )}
              {tool(
                "인용문",
                <span>❞</span>,
                () => editor.chain().focus().toggleBlockquote().run(),
                state.quote,
              )}
            </>,
          )}
          {group(
            "줄·문단 간격",
            <div className="ribbon-paragraph-settings">
              <label>
                줄 간격
                <select
                  aria-label="줄 간격"
                  value={state.line}
                  onChange={(e) =>
                    paragraph({ paragraphLineHeight: e.target.value })
                  }
                >
                  {!lineOptions.includes(state.line) && (
                    <option value={state.line}>
                      {state.line === "normal" ? "보통" : `${state.line}배`}
                    </option>
                  )}
                  {lineOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}배
                    </option>
                  ))}
                </select>
              </label>
              <label>
                문단 앞
                <select
                  aria-label="문단 앞 간격"
                  value={state.before}
                  onChange={(e) =>
                    paragraph({ spacingBefore: Number(e.target.value) })
                  }
                >
                  {[0, 4, 8, 12, 16, 20, 24].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                문단 뒤
                <select
                  aria-label="문단 뒤 간격"
                  value={state.after}
                  onChange={(e) =>
                    paragraph({ spacingAfter: Number(e.target.value) })
                  }
                >
                  {[0, 4, 8, 12, 16, 20, 24].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>,
          )}
        </div>
        <div className="ribbon-page" hidden={page !== 2}>
          {group(
            "삽입",
            <>
              {tool(
                imageBusy ? "이미지 처리 중" : "이미지 넣기",
                <EditorToolIcon name="image" />,
                onImage,
                undefined,
                imageBusy,
              )}
              {tool("표 넣기", <EditorToolIcon name="table" />, onTable)}
              {tool("링크 넣기", <EditorToolIcon name="link" />, onLink)}
              {tool("구분선", <EditorToolIcon name="divider" />, () =>
                editor.chain().focus().setHorizontalRule().run(),
              )}
              {tool(
                "특수문자",
                <EditorToolIcon name="symbol" />,
                () => setSymbolsOpen((v) => !v),
                symbolsOpen,
              )}
            </>,
          )}
          {symbolsOpen && (
            <div
              className="ribbon-symbol-picker"
              role="group"
              aria-label="삽입할 특수문자"
            >
              {[
                "★",
                "☆",
                "✓",
                "→",
                "⇒",
                "±",
                "×",
                "÷",
                "≤",
                "≥",
                "π",
                "∞",
                "∑",
                "√",
                "℃",
                "※",
                "①",
                "②",
                "③",
                "④",
              ].map((symbol) => (
                <button
                  type="button"
                  key={symbol}
                  aria-label={`${symbol} 삽입`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().insertContent(symbol).run();
                    setSymbolsOpen(false);
                  }}
                >
                  {symbol}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ribbon-page" hidden={page !== 3}>
          {group(
            "삽입",
            <>
              {tool("표 넣기", <EditorToolIcon name="table" />, onTable)}
              {tool(
                imageBusy ? "이미지 처리 중" : "이미지 넣기",
                <EditorToolIcon name="image" />,
                onImage,
                undefined,
                imageBusy,
              )}
            </>,
          )}
          {state.table && (
            <>
              {group(
                "행·열 편집",
                <>
                  {tool(
                    "행 위 추가",
                    <EditorToolIcon name="addRow" />,
                    () => editor.chain().focus().addRowBefore().run(),
                    undefined,
                    !state.table,
                  )}
                  {tool(
                    "행 아래 추가",
                    <EditorToolIcon name="addRow" />,
                    () => editor.chain().focus().addRowAfter().run(),
                    undefined,
                    !state.table,
                  )}
                  {tool(
                    "열 왼쪽 추가",
                    <EditorToolIcon name="addColumn" />,
                    () => editor.chain().focus().addColumnBefore().run(),
                    undefined,
                    !state.table,
                  )}
                  {tool(
                    "열 오른쪽 추가",
                    <EditorToolIcon name="addColumn" />,
                    () => editor.chain().focus().addColumnAfter().run(),
                    undefined,
                    !state.table,
                  )}
                  {tool(
                    "행 삭제",
                    <span>행 −</span>,
                    () => editor.chain().focus().deleteRow().run(),
                    undefined,
                    !state.table,
                  )}
                  {tool(
                    "열 삭제",
                    <span>열 −</span>,
                    () => editor.chain().focus().deleteColumn().run(),
                    undefined,
                    !state.table,
                  )}
                </>,
              )}
              {group(
                "표 설정",
                <>
                  {tool(
                    "셀 병합",
                    <span>⊞</span>,
                    () => editor.chain().focus().mergeCells().run(),
                    undefined,
                    !state.merge,
                  )}
                  {tool(
                    "셀 나누기",
                    <span>⊟</span>,
                    () => editor.chain().focus().splitCell().run(),
                    undefined,
                    !state.split,
                  )}
                  {tool(
                    "제목 행",
                    <EditorToolIcon name="table" />,
                    () => editor.chain().focus().toggleHeaderRow().run(),
                    editor.isActive("tableHeader"),
                    !state.table,
                  )}
                  {tool(
                    "표 삭제",
                    <span>표 ×</span>,
                    () => editor.chain().focus().deleteTable().run(),
                    undefined,
                    !state.table,
                  )}
                </>,
              )}
            </>
          )}
          {state.image &&
            group(
              "이미지 편집",
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
              </div>,
            )}
          {!state.table && !state.image && (
            <div className="ribbon-context-empty" role="status">
              <strong>표나 이미지를 삽입하거나 선택해주세요</strong>
              <span>
                새로 넣으려면 왼쪽 버튼을, 기존 항목을 수정하려면 본문의 표
                셀이나 이미지를 클릭하세요.
              </span>
            </div>
          )}
          {(state.table || state.image) && (
            <p className="ribbon-context-hint">
              {state.table
                ? "행·열을 추가하거나 삭제할 수 있습니다. 여러 셀을 드래그해 선택하면 병합할 수 있고, 열 경계선을 드래그하면 너비가 바뀝니다."
                : "이미지 너비와 설명을 바꿀 수 있습니다. 이미지 모서리를 드래그해 크기를 조절할 수도 있습니다."}
            </p>
          )}
        </div>
      </div>
      <div className="ribbon-quickbar" role="toolbar" aria-label="글꼴과 크기">
        <select
          aria-label="문단 스타일"
          className="ribbon-style-select"
          value={state.style}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "P") editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 })
                .run();
          }}
        >
          <option value="P">바탕글</option>
          <option value="H1">제목 1</option>
          <option value="H2">제목 2</option>
          <option value="H3">제목 3</option>
        </select>
        <select
          aria-label="글꼴"
          className="ribbon-font-select"
          value={state.font.replace(/["']/g, "")}
          onChange={(e) =>
            editor.chain().focus().setFontFamily(e.target.value).run()
          }
        >
          {Object.values(FONT_FAMILIES).map((font) => (
            <option key={font}>{font}</option>
          ))}
        </select>
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
            title="글자 크기 (8~96px)"
            type="text"
            inputMode="decimal"
            list={sizeList}
            value={sizeDraft ?? String(state.size)}
            onChange={(e) => setSizeDraft(e.target.value)}
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
          <datalist id={sizeList}>
            {[
              8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 56, 64, 72, 96,
            ].map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
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
        <label className="ribbon-zoom">
          <span>확대</span>
          <select
            aria-label="편집 영역 확대 비율"
            value={zoom}
            onChange={(e) => onZoom(e.target.value)}
          >
            {[75, 90, 100, 125, 150, 175, 200].map((n) => (
              <option key={n} value={n}>
                {n}%
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
