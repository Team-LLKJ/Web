import { useRef, useState, type ClipboardEvent, type MouseEvent } from "react";
import type { AnswerSource, ApiQuestion, Turn } from "../../api/types";
import { Tabs } from "../ui/Tabs";

const MAX_ANSWER_LENGTH = 10_000;
const ALLOWED_TAGS = new Set([
  "P", "DIV", "BR", "STRONG", "B", "EM", "I", "U", "S", "UL", "OL", "LI",
  "H2", "H3", "H4", "BLOCKQUOTE", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD", "SPAN", "A",
]);

const FONT_FAMILIES: Record<string, string> = {
  arial: "Arial",
  "times new roman": "Times New Roman",
  georgia: "Georgia",
  verdana: "Verdana",
  "courier new": "Courier New",
};

function safeStyleValue(property: string, value: string) {
  const normalized = value.trim().toLowerCase();
  if (property === "font-family") {
    const name = normalized.split(",")[0].replace(/["']/g, "").trim();
    return FONT_FAMILIES[name] ?? "";
  }
  if (property === "font-size") return /^(?:[8-9]|[1-4]\d|5[0-6])(?:\.\d+)?(?:px|pt)$/.test(normalized) ? normalized : "";
  if (property === "font-weight") return /^(?:normal|bold|[4-9]00)$/.test(normalized) ? normalized : "";
  if (property === "font-style") return /^(?:normal|italic|oblique)$/.test(normalized) ? normalized : "";
  if (property === "text-align") return /^(?:left|center|right|justify)$/.test(normalized) ? normalized : "";
  if (property === "line-height") return /^(?:normal|[1-3](?:\.\d{1,2})?)$/.test(normalized) ? normalized : "";
  if (property === "text-decoration") return /^(?:none|underline|line-through)(?:\s+(?:underline|line-through))*$/.test(normalized) ? normalized : "";
  if (property === "color" || property === "background-color") {
    return CSS.supports(property, normalized) && !normalized.includes("url(") ? normalized : "";
  }
  return "";
}

function safeHref(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : "";
  } catch {
    return "";
  }
}

function sanitizeAnswerHtml(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("*").forEach((element) => {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "MATH"].includes(element.tagName)) {
        element.remove();
      } else {
        element.replaceWith(...Array.from(element.childNodes));
      }
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      const isCellSpan = (element.tagName === "TD" || element.tagName === "TH")
        && ["colspan", "rowspan"].includes(attribute.name.toLowerCase())
        && /^\d{1,2}$/.test(attribute.value);
      const isSafeLink = element.tagName === "A" && attribute.name.toLowerCase() === "href";
      if (attribute.name.toLowerCase() === "style") {
        const safeStyles: string[] = [];
        const style = (element as HTMLElement).style;
        ["font-family", "font-size", "font-weight", "font-style", "text-align", "line-height", "text-decoration", "color", "background-color"].forEach((property) => {
          const safeValue = safeStyleValue(property, style.getPropertyValue(property));
          if (safeValue) safeStyles.push(`${property}: ${safeValue}`);
        });
        if (safeStyles.length) element.setAttribute("style", safeStyles.join("; "));
        else element.removeAttribute("style");
      } else if (isSafeLink) {
        const href = safeHref(attribute.value);
        if (href) element.setAttribute("href", href);
        else element.removeAttribute("href");
      } else if (!isCellSpan) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  if (!template.content.textContent?.trim() && !template.content.querySelector("table")) return "";
  return template.innerHTML;
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function editorHtmlFromContent(content: string) {
  if (!content) return "";
  if (/<\s*(?:p|div|br|strong|b|em|i|u|s|ul|ol|li|h[2-4]|blockquote|table|thead|tbody|tr|th|td|span|a)\b/i.test(content)) {
    return sanitizeAnswerHtml(content);
  }
  return content.split(/\r?\n/).map((line) => `<p>${line ? escapeHtml(line) : "<br>"}</p>`).join("");
}

function plainTextFromHtml(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.textContent ?? "";
}

function RichAnswerField({
  questionId,
  questionTitle,
  content,
  readOnly,
  saving,
  notice,
  onChange,
  onBlur,
}: {
  questionId: string;
  questionTitle: string;
  content: string;
  readOnly: boolean;
  saving: boolean;
  notice: string;
  onChange: (id: string, html: string) => void;
  onBlur: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [initialHtml] = useState(() => editorHtmlFromContent(content));
  const [lastValidHtml, setLastValidHtml] = useState(initialHtml);
  const [characterCount, setCharacterCount] = useState(() => plainTextFromHtml(initialHtml).length);
  const [isEmpty, setIsEmpty] = useState(() => !plainTextFromHtml(initialHtml).trim() && !initialHtml.includes("<table"));
  const [limitNotice, setLimitNotice] = useState("");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState("11");
  const [textColor, setTextColor] = useState("#202124");
  const [highlightColor, setHighlightColor] = useState("#fff2cc");
  const [paragraphStyle, setParagraphStyle] = useState("P");
  const [lineSpacing, setLineSpacing] = useState("1.15");
  const [editorZoom, setEditorZoom] = useState("100");

  function rememberSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) savedRangeRef.current = range.cloneRange();
  }

  function restoreSelection() {
    const editor = editorRef.current;
    const range = savedRangeRef.current;
    const selection = window.getSelection();
    if (!editor || !range || !selection || !editor.contains(range.commonAncestorContainer)) return;
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function captureChange() {
    const editor = editorRef.current;
    if (!editor) return;
    const text = editor.innerText ?? editor.textContent ?? "";
    if (text.length > MAX_ANSWER_LENGTH) {
      editor.innerHTML = lastValidHtml;
      setLimitNotice(`답안은 ${MAX_ANSWER_LENGTH.toLocaleString()}자까지 작성할 수 있습니다.`);
      return;
    }
    const safeHtml = sanitizeAnswerHtml(editor.innerHTML);
    setLastValidHtml(safeHtml);
    setCharacterCount(text.length);
    setIsEmpty(!text.trim() && !safeHtml.includes("<table"));
    setLimitNotice("");
    onChange(questionId, safeHtml);
    rememberSelection();
  }

  function normalizeLegacyFontMarkup(appliedSize?: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.querySelectorAll("font").forEach((legacyFont) => {
      const span = document.createElement("span");
      const face = legacyFont.getAttribute("face")?.toLowerCase() ?? "";
      const size = legacyFont.getAttribute("size");
      if (FONT_FAMILIES[face]) span.style.fontFamily = FONT_FAMILIES[face];
      if (size) span.style.fontSize = `${appliedSize ?? ({ "1": 8, "2": 10, "3": 12, "4": 14, "5": 18, "6": 24, "7": 36 }[size] ?? 11)}pt`;
      span.innerHTML = legacyFont.innerHTML;
      legacyFont.replaceWith(span);
    });
    const browserSizes = new Set(["xx-small", "x-small", "small", "medium", "large", "x-large", "xx-large", "xxx-large"]);
    editor.querySelectorAll<HTMLElement>("span").forEach((span) => {
      if (appliedSize && browserSizes.has(span.style.fontSize)) span.style.fontSize = `${appliedSize}pt`;
    });
  }

  function runCommand(command: string, value?: string) {
    if (readOnly || !editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
    if (command === "fontName") normalizeLegacyFontMarkup();
    captureChange();
  }

  function applyFontSize(value: string) {
    const size = Math.min(56, Math.max(8, Number(value) || 11));
    setFontSize(String(size));
    if (readOnly || !editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("fontSize", false, "7");
    normalizeLegacyFontMarkup(String(size));
    captureChange();
  }

  function adjustFontSize(amount: number) {
    applyFontSize(String(Math.min(56, Math.max(8, Number(fontSize) + amount))));
  }

  function applyLineSpacing(value: string) {
    setLineSpacing(value);
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const blocks = Array.from(editor.querySelectorAll<HTMLElement>("p, div, h2, h3, h4, li, blockquote"));
    const selectedBlocks = range ? blocks.filter((block) => range.intersectsNode(block)) : [];
    (selectedBlocks.length ? selectedBlocks : blocks.slice(0, 1)).forEach((block) => {
      block.style.lineHeight = value;
    });
    captureChange();
  }

  function insertLink() {
    const enteredUrl = window.prompt("링크 주소를 입력하세요.", "https://");
    if (!enteredUrl) return;
    const href = safeHref(enteredUrl.trim());
    if (!href) {
      setLimitNotice("http, https 또는 mailto 주소를 입력해주세요.");
      return;
    }
    const selection = window.getSelection();
    if (selection?.isCollapsed) {
      runCommand("insertHTML", `<a href="${escapeHtml(href)}">${escapeHtml(enteredUrl.trim())}</a>`);
    } else {
      runCommand("createLink", href);
    }
  }

  function clearFormatting() {
    runCommand("removeFormat");
    runCommand("formatBlock", "<p>");
    setParagraphStyle("P");
    setFontFamily("Arial");
    setFontSize("11");
    setTextColor("#202124");
    setHighlightColor("#fff2cc");
  }

  function findText() {
    const term = window.prompt("답안에서 찾을 내용을 입력하세요.");
    const editor = editorRef.current;
    if (!term || !editor) return;
    const query = term.toLocaleLowerCase();
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode() as Text | null;
    while (node) {
      const index = (node.textContent ?? "").toLocaleLowerCase().indexOf(query);
      if (index >= 0) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + term.length);
        editor.focus();
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        node.parentElement?.scrollIntoView({ block: "nearest" });
        rememberSelection();
        return;
      }
      node = walker.nextNode() as Text | null;
    }
    setLimitNotice("찾는 내용을 답안에서 찾지 못했습니다.");
  }

  function applyEditorZoom(value: string) {
    setEditorZoom(value);
    if (editorRef.current) editorRef.current.style.zoom = `${value}%`;
  }

  function insertTable() {
    const cell = "<td><br></td>";
    const header = "<th><br></th>";
    runCommand("insertHTML", `<table><thead><tr>${header.repeat(3)}</tr></thead><tbody><tr>${cell.repeat(3)}</tr><tr>${cell.repeat(3)}</tr></tbody></table><p><br></p>`);
  }

  function selectedCell() {
    const selection = window.getSelection();
    const anchor = selection?.anchorNode;
    const element = anchor instanceof Element ? anchor : anchor?.parentElement;
    return element?.closest("td, th") ?? null;
  }

  function addTableRow() {
    restoreSelection();
    const cell = selectedCell();
    if (!cell) {
      setLimitNotice("표 안을 클릭한 뒤 행을 추가해주세요.");
      return;
    }
    const row = cell.closest("tr");
    if (!row) return;
    const nextRow = document.createElement("tr");
    const table = row.closest("table");
    let rowGroup = row.parentElement;
    let insertionPoint: Node | null = row.nextSibling;
    if (rowGroup?.tagName === "THEAD" && table) {
      rowGroup = table.tBodies[0] ?? table.createTBody();
      insertionPoint = rowGroup.firstChild;
    }
    if (!rowGroup) return;
    rowGroup.insertBefore(nextRow, insertionPoint);
    Array.from(row.cells).forEach(() => {
      const newCell = document.createElement("td");
      newCell.append(document.createElement("br"));
      nextRow.append(newCell);
    });
    captureChange();
  }

  function addTableColumn() {
    restoreSelection();
    const cell = selectedCell();
    if (!cell) {
      setLimitNotice("표 안을 클릭한 뒤 열을 추가해주세요.");
      return;
    }
    const row = cell.closest("tr");
    const table = cell.closest("table");
    if (!row || !table) return;
    const position = Array.from(row.cells).indexOf(cell as HTMLTableCellElement) + 1;
    Array.from(table.rows).forEach((tableRow) => {
      const newCell = document.createElement(tableRow.parentElement?.tagName === "THEAD" ? "th" : "td");
      newCell.append(document.createElement("br"));
      tableRow.insertBefore(newCell, tableRow.cells[position] ?? null);
    });
    captureChange();
  }

  function preserveSelection(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    rememberSelection();
  }

  function pastePlainText(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    captureChange();
  }

  return (
    <div className="answer-rich-editor">
      {!readOnly && (
        <div className="answer-toolbar-scroll">
          <div className="answer-toolbar" role="toolbar" aria-label="답안 서식">
            <div className="answer-toolbar-group">
              <button type="button" className="answer-tool-icon" title="답안에서 찾기" aria-label="답안에서 찾기" onMouseDown={preserveSelection} onClick={findText}>⌕</button>
              <button type="button" className="answer-tool-icon" title="실행 취소" aria-label="실행 취소" onMouseDown={preserveSelection} onClick={() => runCommand("undo")}>↶</button>
              <button type="button" className="answer-tool-icon" title="다시 실행" aria-label="다시 실행" onMouseDown={preserveSelection} onClick={() => runCommand("redo")}>↷</button>
            </div>
            <span className="answer-toolbar-divider" aria-hidden="true" />
            <select className="answer-zoom-select" aria-label="편집 영역 확대 비율" value={editorZoom} onMouseDown={rememberSelection} onChange={(event) => applyEditorZoom(event.target.value)}>
              {[75, 90, 100, 125, 150].map((zoom) => <option key={zoom} value={zoom}>{zoom}%</option>)}
            </select>
            <select className="answer-style-select" aria-label="문단 스타일" value={paragraphStyle} onMouseDown={rememberSelection} onChange={(event) => {
              const style = event.target.value;
              setParagraphStyle(style);
              runCommand("formatBlock", style === "P" ? "<p>" : `<${style.toLowerCase()}>`);
            }}>
              <option value="P">일반 텍스트</option>
              <option value="H2">제목 1</option>
              <option value="H3">제목 2</option>
              <option value="H4">제목 3</option>
            </select>
            <select className="answer-font-select" aria-label="글꼴" value={fontFamily} onMouseDown={rememberSelection} onChange={(event) => {
              setFontFamily(event.target.value);
              runCommand("fontName", event.target.value);
            }}>
              {Object.values(FONT_FAMILIES).map((font) => <option key={font} value={font}>{font}</option>)}
            </select>
            <div className="answer-toolbar-group answer-font-size-group">
              <button type="button" className="answer-tool-icon" title="글자 크기 줄이기" aria-label="글자 크기 줄이기" onMouseDown={preserveSelection} onClick={() => adjustFontSize(-1)}>−</button>
              <select className="answer-font-size-select" aria-label="글자 크기" value={fontSize} onMouseDown={rememberSelection} onChange={(event) => applyFontSize(event.target.value)}>
                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 56].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <button type="button" className="answer-tool-icon" title="글자 크기 늘리기" aria-label="글자 크기 늘리기" onMouseDown={preserveSelection} onClick={() => adjustFontSize(1)}>＋</button>
            </div>
            <span className="answer-toolbar-divider" aria-hidden="true" />
            <div className="answer-toolbar-group">
              <button type="button" className="answer-tool-icon answer-bold-icon" title="굵게" aria-label="굵게" onMouseDown={preserveSelection} onClick={() => runCommand("bold")}>B</button>
              <button type="button" className="answer-tool-icon answer-italic-icon" title="기울임" aria-label="기울임" onMouseDown={preserveSelection} onClick={() => runCommand("italic")}>I</button>
              <button type="button" className="answer-tool-icon answer-underline-icon" title="밑줄" aria-label="밑줄" onMouseDown={preserveSelection} onClick={() => runCommand("underline")}>U</button>
              <label className="answer-color-control" title="글자 색상">
                <span style={{ borderBottomColor: textColor }}>A</span>
                <input aria-label="글자 색상" type="color" value={textColor} onMouseDown={rememberSelection} onChange={(event) => {
                  setTextColor(event.target.value);
                  runCommand("foreColor", event.target.value);
                }} />
              </label>
              <label className="answer-color-control answer-highlight-control" title="강조 색상">
                <span style={{ backgroundColor: highlightColor }}>▰</span>
                <input aria-label="강조 색상" type="color" value={highlightColor} onMouseDown={rememberSelection} onChange={(event) => {
                  setHighlightColor(event.target.value);
                  runCommand("hiliteColor", event.target.value);
                }} />
              </label>
            </div>
            <span className="answer-toolbar-divider" aria-hidden="true" />
            <button type="button" className="answer-tool-icon" title="링크 삽입" aria-label="링크 삽입" onMouseDown={preserveSelection} onClick={insertLink}>↗</button>
            <select className="answer-tool-select" aria-label="문단 정렬" defaultValue="justifyLeft" onMouseDown={rememberSelection} onChange={(event) => runCommand(event.target.value)}>
              <option value="justifyLeft">왼쪽 정렬</option>
              <option value="justifyCenter">가운데 정렬</option>
              <option value="justifyRight">오른쪽 정렬</option>
              <option value="justifyFull">양쪽 정렬</option>
            </select>
            <select className="answer-tool-select answer-line-spacing" aria-label="줄 간격" value={lineSpacing} onMouseDown={rememberSelection} onChange={(event) => applyLineSpacing(event.target.value)}>
              <option value="1">줄 간격 1.0</option>
              <option value="1.15">줄 간격 1.15</option>
              <option value="1.5">줄 간격 1.5</option>
              <option value="2">줄 간격 2.0</option>
            </select>
            <span className="answer-toolbar-divider" aria-hidden="true" />
            <div className="answer-toolbar-group">
              <button type="button" className="answer-tool-icon" title="체크리스트" aria-label="체크리스트 삽입" onMouseDown={preserveSelection} onClick={() => runCommand("insertHTML", "<ul><li>☐ </li></ul><p><br></p>")}>☑</button>
              <button type="button" className="answer-tool-icon" title="글머리 기호 목록" aria-label="글머리 기호 목록" onMouseDown={preserveSelection} onClick={() => runCommand("insertUnorderedList")}>•</button>
              <button type="button" className="answer-tool-icon" title="번호 목록" aria-label="번호 목록" onMouseDown={preserveSelection} onClick={() => runCommand("insertOrderedList")}>1.</button>
              <button type="button" className="answer-tool-icon" title="내어쓰기" aria-label="내어쓰기" onMouseDown={preserveSelection} onClick={() => runCommand("outdent")}>⇤</button>
              <button type="button" className="answer-tool-icon" title="들여쓰기" aria-label="들여쓰기" onMouseDown={preserveSelection} onClick={() => runCommand("indent")}>⇥</button>
            </div>
            <span className="answer-toolbar-divider" aria-hidden="true" />
            <button type="button" className="answer-tool-icon" title="서식 지우기" aria-label="서식 지우기" onMouseDown={preserveSelection} onClick={clearFormatting}>Tx</button>
            <span className="answer-toolbar-divider" aria-hidden="true" />
            <div className="answer-toolbar-group">
              <button type="button" title="3행 3열 표 삽입" aria-label="3행 3열 표 삽입" onMouseDown={preserveSelection} onClick={insertTable}>표</button>
              <button type="button" title="현재 표에 행 추가" aria-label="표에 행 추가" onMouseDown={preserveSelection} onClick={addTableRow}>행＋</button>
              <button type="button" title="현재 표에 열 추가" aria-label="표에 열 추가" onMouseDown={preserveSelection} onClick={addTableColumn}>열＋</button>
            </div>
          </div>
        </div>
      )}
      <div
        ref={editorRef}
        className="student-answer-content"
        role="textbox"
        aria-label={`${questionTitle} 답안`}
        aria-multiline="true"
        aria-readonly={readOnly}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-placeholder="답안을 작성하세요."
        data-empty={isEmpty}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        onInput={captureChange}
        onBlur={() => { rememberSelection(); onBlur(); }}
        onMouseUp={rememberSelection}
        onKeyUp={rememberSelection}
        onPaste={pastePlainText}
      />
      <div className="answer-rich-status" aria-live="polite">
        <span>{limitNotice || (saving ? "저장 중…" : notice)}</span>
        {!readOnly && <span>{characterCount.toLocaleString()} / {MAX_ANSWER_LENGTH.toLocaleString()}자</span>}
      </div>
    </div>
  );
}

export function AnswerEditor({
  questions,
  questionId,
  answers,
  readOnly,
  sourceByQuestion,
  aiRequestByQuestion,
  completedTurns,
  savingQuestionId,
  notice,
  onQuestion,
  onAnswer,
  onSave,
  onSourceChange,
  onAiRequestChange,
}: {
  questions: ApiQuestion[];
  questionId: string;
  answers: Record<string, string>;
  readOnly: boolean;
  sourceByQuestion: Record<string, AnswerSource>;
  aiRequestByQuestion: Record<string, string>;
  completedTurns: Turn[];
  savingQuestionId: string;
  notice: string;
  onQuestion: (id: string) => void;
  onAnswer: (id: string, text: string) => void;
  onSave: (id: string) => void;
  onSourceChange: (id: string, source: AnswerSource) => void;
  onAiRequestChange: (id: string, requestId: string) => void;
}) {
  const question = questions.find((item) => item.id === questionId);
  const source = sourceByQuestion[questionId] ?? "DIRECT";
  const references = completedTurns.filter((turn) => turn.questionId === questionId && turn.state === "COMPLETED");

  return (
    <section className="student-editor">
      <h1>{readOnly ? "제출 답안" : "답안 작성"}</h1>
      {readOnly && <p className="submission-lock-notice" role="status">제출 또는 평가 종료 후에는 답안을 수정할 수 없습니다.</p>}
      <Tabs
        label="문항"
        value={questionId}
        items={questions.map((item) => ({ value: item.id, label: item.title }))}
        onChange={onQuestion}
      />
      {question ? (
        <>
          <section className="question-box">
            <h3>문항 내용</h3>
            <p>{question.content}</p>
          </section>
          <RichAnswerField
            key={questionId}
            questionId={questionId}
            questionTitle={question.title}
            content={answers[questionId] ?? ""}
            readOnly={readOnly}
            saving={savingQuestionId === questionId}
            notice={notice}
            onChange={onAnswer}
            onBlur={() => { if (!readOnly) onSave(questionId); }}
          />
          {!readOnly && (
            <div className="answer-source-control">
              <label>
                <span>답안 작성 방식</span>
                <select value={source} onChange={(event) => onSourceChange(questionId, event.target.value as AnswerSource)}>
                  <option value="DIRECT">직접 작성</option>
                  <option value="AI_REFERENCED">AI 답변 참고</option>
                  <option value="AI_USED">AI 답변 사용</option>
                </select>
              </label>
              {source !== "DIRECT" && (
                <label>
                  <span>참고한 AI 대화</span>
                  <select value={aiRequestByQuestion[questionId] ?? ""} onChange={(event) => onAiRequestChange(questionId, event.target.value)}>
                    <option value="">완료된 대화를 선택하세요</option>
                    {references.map((turn) => <option key={turn.requestId} value={turn.requestId}>{turn.questionText}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="empty">등록된 문항이 없습니다.</p>
      )}
    </section>
  );
}
