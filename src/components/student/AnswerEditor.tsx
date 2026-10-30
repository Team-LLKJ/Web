import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type MouseEvent,
} from "react";
import type { AnswerSource, ApiQuestion, Turn } from "../../api/types";
import { prepareAnswerImage } from "./answerImage";
import { AnswerRibbon } from "./AnswerRibbon";
import { Tabs } from "../ui/Tabs";

const MAX_ANSWER_LENGTH = 10_000;
const DEFAULT_FONT_SIZE = 20;
const MAX_ANSWER_HTML_LENGTH = 1_000_000;
const EMPTY_CARET = "\u200B";
const ALLOWED_TAGS = new Set([
  "P",
  "DIV",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",
  "UL",
  "OL",
  "LI",
  "H2",
  "H3",
  "H4",
  "BLOCKQUOTE",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TR",
  "TH",
  "TD",
  "SPAN",
  "A",
  "IMG",
  "HR",
]);

const FONT_FAMILIES: Record<string, string> = {
  "맑은 고딕": "맑은 고딕",
  굴림: "굴림",
  바탕: "바탕",
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
  if (property === "font-size")
    return /^(?:[8-9]|[1-4]\d|5[0-6])(?:\.\d+)?(?:px|pt)$/.test(normalized)
      ? normalized
      : "";
  if (property === "font-weight")
    return /^(?:normal|bold|[4-9]00)$/.test(normalized) ? normalized : "";
  if (property === "font-style")
    return /^(?:normal|italic|oblique)$/.test(normalized) ? normalized : "";
  if (property === "text-align")
    return /^(?:left|center|right|justify)$/.test(normalized) ? normalized : "";
  if (property === "line-height")
    return /^(?:normal|[1-3](?:\.\d{1,2})?)$/.test(normalized)
      ? normalized
      : "";
  if (property === "text-decoration")
    return /^(?:none|underline|line-through)(?:\s+(?:underline|line-through))*$/.test(
      normalized,
    )
      ? normalized
      : "";
  if (property === "color" || property === "background-color") {
    return CSS.supports(property, normalized) && !normalized.includes("url(")
      ? normalized
      : "";
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
      if (
        ["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "MATH"].includes(
          element.tagName,
        )
      ) {
        element.remove();
      } else {
        element.replaceWith(...Array.from(element.childNodes));
      }
      return;
    }
    if (element.tagName === "IMG") {
      const src = element.getAttribute("src") ?? "";
      if (
        src.length > 180_000 ||
        !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(src)
      ) {
        element.remove();
        return;
      }
    }
    Array.from(element.attributes).forEach((attribute) => {
      const isCellSpan =
        (element.tagName === "TD" || element.tagName === "TH") &&
        ["colspan", "rowspan"].includes(attribute.name.toLowerCase()) &&
        /^\d{1,2}$/.test(attribute.value);
      const isImageAttribute =
        element.tagName === "IMG" &&
        (attribute.name === "src" ||
          (attribute.name === "alt" && attribute.value.length <= 200) ||
          (attribute.name === "width" &&
            /^\d{1,4}$/.test(attribute.value) &&
            Number(attribute.value) <= 1600));
      const isSafeLink =
        element.tagName === "A" && attribute.name.toLowerCase() === "href";
      if (attribute.name.toLowerCase() === "style") {
        const safeStyles: string[] = [];
        const style = (element as HTMLElement).style;
        [
          "font-family",
          "font-size",
          "font-weight",
          "font-style",
          "text-align",
          "line-height",
          "text-decoration",
          "color",
          "background-color",
        ].forEach((property) => {
          const safeValue = safeStyleValue(
            property,
            style.getPropertyValue(property),
          );
          if (safeValue) safeStyles.push(`${property}: ${safeValue}`);
        });
        if (safeStyles.length)
          element.setAttribute("style", safeStyles.join("; "));
        else element.removeAttribute("style");
      } else if (isSafeLink) {
        const href = safeHref(attribute.value);
        if (href) element.setAttribute("href", href);
        else element.removeAttribute("href");
      } else if (!isCellSpan && !isImageAttribute) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  const textNodes = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_TEXT,
  );
  let textNode: Node | null;
  while ((textNode = textNodes.nextNode()))
    textNode.textContent =
      textNode.textContent?.replaceAll(EMPTY_CARET, "") ?? "";
  if (
    !template.content.textContent?.trim() &&
    !template.content.querySelector("table, img, hr")
  )
    return "";
  return template.innerHTML;
}

function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function editorHtmlFromContent(content: string) {
  if (!content) return "";
  if (
    /<\s*(?:p|div|br|strong|b|em|i|u|s|ul|ol|li|h[2-4]|blockquote|table|thead|tbody|tr|th|td|span|a|img|hr)\b/i.test(
      content,
    )
  ) {
    return sanitizeAnswerHtml(content);
  }
  return content
    .split(/\r?\n/)
    .map((line) => `<p>${line ? escapeHtml(line) : "<br>"}</p>`)
    .join("");
}

function plainTextFromHtml(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return (template.content.textContent ?? "").replaceAll(EMPTY_CARET, "");
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const readOnlyRef = useRef(readOnly);
  const [imageBusy, setImageBusy] = useState(false);
  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const [initialHtml] = useState(() => editorHtmlFromContent(content));
  const [lastValidHtml, setLastValidHtml] = useState(initialHtml);
  const [characterCount, setCharacterCount] = useState(
    () => plainTextFromHtml(initialHtml).length,
  );
  const [isEmpty, setIsEmpty] = useState(
    () =>
      !plainTextFromHtml(initialHtml).trim() &&
      !/<(?:table|img|hr)\b/i.test(initialHtml),
  );
  const [limitNotice, setLimitNotice] = useState("");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(String(DEFAULT_FONT_SIZE));
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
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
      const anchor = selection.anchorNode;
      const element =
        anchor?.nodeType === Node.ELEMENT_NODE
          ? (anchor as HTMLElement)
          : anchor?.parentElement;
      if (element && editor.contains(element)) {
        const computed = getComputedStyle(element);
        const size = parseFloat(computed.fontSize);
        if (Number.isFinite(size))
          setFontSize(String(Math.round(size * 10) / 10));
        const family = computed.fontFamily
          .split(",")[0]
          .replace(/["']/g, "")
          .trim()
          .toLowerCase();
        if (FONT_FAMILIES[family]) setFontFamily(FONT_FAMILIES[family]);
      }
    }
  }

  function restoreSelection() {
    const editor = editorRef.current;
    const range = savedRangeRef.current;
    const selection = window.getSelection();
    if (
      !editor ||
      !range ||
      !selection ||
      !editor.contains(range.commonAncestorContainer)
    )
      return;
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function captureChange() {
    const editor = editorRef.current;
    if (!editor) return;
    const text = (editor.innerText ?? editor.textContent ?? "").replaceAll(
      EMPTY_CARET,
      "",
    );
    if (text.length > MAX_ANSWER_LENGTH) {
      editor.innerHTML = lastValidHtml;
      setLimitNotice(
        `답안은 ${MAX_ANSWER_LENGTH.toLocaleString()}자까지 작성할 수 있습니다.`,
      );
      return;
    }
    const safeHtml = sanitizeAnswerHtml(editor.innerHTML);
    if (safeHtml.length > MAX_ANSWER_HTML_LENGTH) {
      editor.innerHTML = lastValidHtml;
      setLimitNotice(
        "답안에 포함된 이미지가 많습니다. 이미지 일부를 삭제한 뒤 다시 시도해주세요.",
      );
      return;
    }
    setLastValidHtml(safeHtml);
    setCharacterCount(text.length);
    setIsEmpty(!text.trim() && !/<(?:table|img|hr)\b/i.test(safeHtml));
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
      if (size)
        span.style.fontSize = `${appliedSize ?? { "1": 8, "2": 10, "3": 12, "4": 14, "5": 18, "6": 24, "7": 36 }[size] ?? DEFAULT_FONT_SIZE}px`;
      span.innerHTML = legacyFont.innerHTML;
      legacyFont.replaceWith(span);
    });
    const browserSizes = new Set([
      "xx-small",
      "x-small",
      "small",
      "medium",
      "large",
      "x-large",
      "xx-large",
      "xxx-large",
    ]);
    editor.querySelectorAll<HTMLElement>("span").forEach((span) => {
      if (appliedSize && browserSizes.has(span.style.fontSize))
        span.style.fontSize = `${appliedSize}px`;
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
    const size = Math.min(56, Math.max(8, Number(value) || DEFAULT_FONT_SIZE));
    const editor = editorRef.current;
    if (readOnly || !editor) return;
    editor.focus();
    restoreSelection();
    const selection = window.getSelection();
    if (!selection) return;
    if (
      !selection.rangeCount ||
      !editor.contains(selection.getRangeAt(0).commonAncestorContainer)
    ) {
      const end = document.createRange();
      end.selectNodeContents(editor);
      end.collapse(false);
      selection.removeAllRanges();
      selection.addRange(end);
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      // Give the caret a real font-sized span; browser fontSize commands use legacy sizes.
      const span = document.createElement("span");
      span.style.fontSize = `${size}px`;
      const caret = document.createTextNode(EMPTY_CARET);
      span.append(caret);
      range.insertNode(span);
      range.setStart(caret, 1);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("fontSize", false, "7");
      normalizeLegacyFontMarkup(String(size));
    }
    captureChange();
    setFontSize(String(size));
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
    const blocks = Array.from(
      editor.querySelectorAll<HTMLElement>(
        "p, div, h2, h3, h4, li, blockquote",
      ),
    );
    const selectedBlocks = range
      ? blocks.filter((block) => range.intersectsNode(block))
      : [];
    (selectedBlocks.length ? selectedBlocks : blocks.slice(0, 1)).forEach(
      (block) => {
        block.style.lineHeight = value;
      },
    );
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
      runCommand(
        "insertHTML",
        `<a href="${escapeHtml(href)}">${escapeHtml(enteredUrl.trim())}</a>`,
      );
    } else {
      runCommand("createLink", href);
    }
  }

  function clearFormatting() {
    runCommand("removeFormat");
    runCommand("formatBlock", "<p>");
    setParagraphStyle("P");
    setFontFamily("Arial");
    setFontSize(String(DEFAULT_FONT_SIZE));
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
    const zoom = String(Math.max(75, Number(value) || 100));
    setEditorZoom(zoom);
    editorRef.current?.style.setProperty(
      "--answer-editor-zoom",
      String(Number(zoom) / 100),
    );
  }

  async function insertImage(file: File) {
    if (readOnly || imageBusy) return;
    setImageBusy(true);
    setLimitNotice("");
    try {
      const src = await prepareAnswerImage(file);
      if (!mountedRef.current || readOnlyRef.current || !editorRef.current)
        return;
      runCommand(
        "insertHTML",
        `<p><img src="${src}" alt="${escapeHtml(file.name.slice(0, 200))}"></p><p><br></p>`,
      );
    } catch (error) {
      if (mountedRef.current)
        setLimitNotice(
          error instanceof Error
            ? error.message
            : "이미지를 불러오지 못했습니다.",
        );
    } finally {
      if (mountedRef.current) setImageBusy(false);
    }
  }

  function insertTable() {
    const cell = "<td><br></td>";
    const header = "<th><br></th>";
    runCommand(
      "insertHTML",
      `<table><thead><tr>${header.repeat(3)}</tr></thead><tbody><tr>${cell.repeat(3)}</tr><tr>${cell.repeat(3)}</tr></tbody></table><p><br></p>`,
    );
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
    const position =
      Array.from(row.cells).indexOf(cell as HTMLTableCellElement) + 1;
    Array.from(table.rows).forEach((tableRow) => {
      const newCell = document.createElement(
        tableRow.parentElement?.tagName === "THEAD" ? "th" : "td",
      );
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
        <input
          ref={imageInputRef}
          className="answer-image-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="답안에 넣을 이미지"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void insertImage(file);
          }}
        />
      )}
      {!readOnly && (
        <AnswerRibbon
          fontFamily={fontFamily}
          fonts={Object.values(FONT_FAMILIES)}
          fontSize={fontSize}
          paragraphStyle={paragraphStyle}
          lineSpacing={lineSpacing}
          editorZoom={editorZoom}
          textColor={textColor}
          highlightColor={highlightColor}
          onPreserveSelection={preserveSelection}
          onRememberSelection={rememberSelection}
          onCommand={runCommand}
          onFont={(value) => {
            setFontFamily(value);
            runCommand("fontName", value);
          }}
          onSize={applyFontSize}
          onAdjustSize={adjustFontSize}
          onStyle={(value) => {
            setParagraphStyle(value);
            runCommand(
              "formatBlock",
              value === "P" ? "<p>" : `<${value.toLowerCase()}>`,
            );
          }}
          onSpacing={applyLineSpacing}
          onZoom={applyEditorZoom}
          onTextColor={(value) => {
            setTextColor(value);
            runCommand("foreColor", value);
          }}
          onHighlight={(value) => {
            setHighlightColor(value);
            runCommand("hiliteColor", value);
          }}
          onFind={findText}
          onLink={insertLink}
          onClear={clearFormatting}
          onTable={insertTable}
          onRow={addTableRow}
          onColumn={addTableColumn}
          imageBusy={imageBusy}
          onImage={() => imageInputRef.current?.click()}
          onDivider={() => runCommand("insertHTML", "<hr><p><br></p>")}
          onSymbol={(symbol) => runCommand("insertText", symbol)}
        />
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
        onBlur={() => {
          rememberSelection();
          onBlur();
        }}
        onFocus={rememberSelection}
        onMouseUp={rememberSelection}
        onKeyUp={rememberSelection}
        onPaste={pastePlainText}
      />
      <div className="answer-rich-status" aria-live="polite">
        <span>{limitNotice || (saving ? "저장 중…" : notice)}</span>
        {!readOnly && (
          <span>
            {characterCount.toLocaleString()} /{" "}
            {MAX_ANSWER_LENGTH.toLocaleString()}자
          </span>
        )}
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
  const references = completedTurns.filter(
    (turn) => turn.questionId === questionId && turn.state === "COMPLETED",
  );

  return (
    <section className="student-editor">
      <h1>{readOnly ? "제출 답안" : "답안 작성"}</h1>
      {readOnly && (
        <p className="submission-lock-notice" role="status">
          제출 또는 평가 종료 후에는 답안을 수정할 수 없습니다.
        </p>
      )}
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
            onBlur={() => {
              if (!readOnly) onSave(questionId);
            }}
          />
          {!readOnly && (
            <div className="answer-source-control">
              <label>
                <span>답안 작성 방식</span>
                <select
                  value={source}
                  onChange={(event) =>
                    onSourceChange(
                      questionId,
                      event.target.value as AnswerSource,
                    )
                  }
                >
                  <option value="DIRECT">직접 작성</option>
                  <option value="AI_REFERENCED">AI 답변 참고</option>
                  <option value="AI_USED">AI 답변 사용</option>
                </select>
              </label>
              {source !== "DIRECT" && (
                <label>
                  <span>참고한 AI 대화</span>
                  <select
                    value={aiRequestByQuestion[questionId] ?? ""}
                    onChange={(event) =>
                      onAiRequestChange(questionId, event.target.value)
                    }
                  >
                    <option value="">완료된 대화를 선택하세요</option>
                    {references.map((turn) => (
                      <option key={turn.requestId} value={turn.requestId}>
                        {turn.questionText}
                      </option>
                    ))}
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
