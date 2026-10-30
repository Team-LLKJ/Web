import { useEffect, useRef, useState, type ReactNode } from "react";

type Command = "bold" | "italic" | "underline" | "strikeThrough" | "insertUnorderedList" | "insertOrderedList" | "removeFormat";
const tools: { command: Command; label: string; icon: ReactNode }[] = [
  {
    command: "bold",
    label: "굵게 (Ctrl+B)",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z" /></svg>,
  },
  {
    command: "italic",
    label: "기울임 (Ctrl+I)",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M10 4h9M5 20h9M15 4 9 20" /></svg>,
  },
  {
    command: "underline",
    label: "밑줄 (Ctrl+U)",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 4v6a5 5 0 0 0 10 0V4M5 21h14" /></svg>,
  },
  {
    command: "strikeThrough",
    label: "취소선",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16M16.5 7.5C16 5.5 14.2 4 12 4c-2.5 0-4.5 1.5-4.5 3.7 0 1.5.9 2.6 2.6 3.3M8 16.5c.6 2 2.2 3.5 4.3 3.5 2.6 0 4.7-1.5 4.7-3.8 0-.8-.2-1.5-.7-2.2" /></svg>,
  },
  {
    command: "insertUnorderedList",
    label: "글머리 기호 목록",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" fill="currentColor" /><circle cx="4.5" cy="12" r="1" fill="currentColor" /><circle cx="4.5" cy="18" r="1" fill="currentColor" /></svg>,
  },
  {
    command: "insertOrderedList",
    label: "번호 목록",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M10 6h10M10 12h10M10 18h10" /><path d="M4 5h1v4M4 9h2" /><path d="M4 14.5a1 1 0 0 1 2 0c0 1-2 1.5-2 3h2" /></svg>,
  },
  {
    command: "removeFormat",
    label: "서식 지우기",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 5h12M12 5l-3 14" /><path d="m15 15 5 5M20 15l-5 5" /></svg>,
  },
];
const stateCommands: Command[] = ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList"];

// 예전에 일반 텍스트로 저장된 메모도 줄바꿈을 유지한 채 불러옵니다.
const toHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value)
  ? value
  : value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

export function RichTextEditor({
  label,
  description,
  value,
  placeholder,
  disabled = false,
  maxLength = 10000,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Command[]>([]);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [overLimit, setOverLimit] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.innerHTML === value) return;
    editor.innerHTML = toHtml(value);
    setIsEmpty(!editor.textContent?.trim());
  }, [value]);

  useEffect(() => {
    const updateActive = () => {
      if (!editorRef.current?.contains(document.getSelection()?.anchorNode ?? null)) return;
      setActive(stateCommands.filter((command) => document.queryCommandState(command)));
    };
    document.addEventListener("selectionchange", updateActive);
    return () => document.removeEventListener("selectionchange", updateActive);
  }, []);

  function emit() {
    const editor = editorRef.current;
    if (!editor) return;
    const text = editor.textContent ?? "";
    setIsEmpty(!text.trim() && !editor.querySelector("li"));
    setOverLimit(text.length > maxLength);
    onChange(text.trim() || editor.querySelector("li") ? editor.innerHTML : "");
  }

  function run(command: Command) {
    editorRef.current?.focus();
    document.execCommand(command);
    setActive(stateCommands.filter((item) => document.queryCommandState(item)));
    emit();
  }

  return (
    <div className="teacher-textarea-label teacher-guidelines-label">
      <span>{label} {description && <small>{description}</small>}</span>
      <div className={`rich-text${disabled ? " is-disabled" : ""}${overLimit ? " is-over" : ""}`}>
        <div className="rich-text-toolbar" role="toolbar" aria-label={`${label} 서식`}>
          {tools.map((tool) => (
            <button
              key={tool.command}
              type="button"
              className={active.includes(tool.command) ? "is-active" : ""}
              aria-label={tool.label}
              aria-pressed={stateCommands.includes(tool.command) ? active.includes(tool.command) : undefined}
              title={tool.label}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => run(tool.command)}
            >
              {tool.icon}
            </button>
          ))}
        </div>
        <div
          ref={editorRef}
          className={`rich-text-editor${isEmpty ? " is-empty" : ""}`}
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          aria-disabled={disabled}
          data-placeholder={placeholder}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emit}
          onPaste={(event) => {
            event.preventDefault();
            document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
          }}
        />
      </div>
      {overLimit && <span className="input-error">{maxLength.toLocaleString()}자 이내로 입력해주세요.</span>}
    </div>
  );
}
