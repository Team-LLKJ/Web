import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { answerExtensions } from "../student/answerExtensions";
import {
  editorHtmlFromContent,
  sanitizeAnswerHtml,
  MAX_ANSWER_HTML_LENGTH,
} from "../student/answerHtml";
import { AnswerRibbon } from "../student/AnswerRibbon";
import {
  AnswerLinkDialog,
  AnswerShortcutsDialog,
} from "../student/AnswerToolsDialogs";
import "../student/student.css";
import "../student/docs-editor.css";

// 학생 답안 작성 화면과 같은 서식 도구(AnswerRibbon)를 그대로 사용하는 평가 내용 편집기입니다.
export function RichTextEditor({
  label,
  value,
  placeholder,
  disabled = false,
  maxLength = 10000,
  invalid = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  invalid?: boolean;
  onChange: (html: string) => void;
}) {
  const callbacks = useRef({ onChange });
  useEffect(() => {
    callbacks.current = { onChange };
  }, [onChange]);
  const lastEmitted = useRef(value);
  const [zoom, setZoom] = useState("100");
  const [dialog, setDialog] = useState<"" | "link" | "help">("");
  const [initialHtml] = useState(() => editorHtmlFromContent(value));
  const extensions = useMemo(
    () =>
      answerExtensions().map((extension) =>
        extension.name === "placeholder"
          ? extension.configure({ placeholder: placeholder ?? "" })
          : extension.name === "characterCount"
            ? extension.configure({ limit: maxLength })
            : extension,
      ),
    [placeholder, maxLength],
  );
  const editor: Editor | null = useEditor({
    extensions,
    content: initialHtml,
    editable: !disabled,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: "student-answer-content",
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
      },
      transformPastedHTML: (html) =>
        html.length <= MAX_ANSWER_HTML_LENGTH ? sanitizeAnswerHtml(html) : "",
    },
    onUpdate: ({ editor: current, transaction }) => {
      if (!transaction.docChanged) return;
      const html = current.isEmpty && !current.getHTML().includes("<table")
        ? ""
        : sanitizeAnswerHtml(current.getHTML());
      lastEmitted.current = html;
      callbacks.current.onChange(html);
    },
  });
  useEffect(() => {
    if (editor && editor.isEditable === disabled) editor.setEditable(!disabled);
  }, [editor, disabled]);
  // 폼이 초기화되는 등 바깥에서 값이 바뀌면 편집기에도 반영합니다.
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(editorHtmlFromContent(value), { emitUpdate: false });
  }, [editor, value]);
  if (!editor) return <div className="answer-rich-editor teacher-rich-editor" data-error={invalid || undefined} />;
  return (
    <div
      className={`answer-rich-editor teacher-rich-editor${disabled ? " is-disabled" : ""}`}
      data-error={invalid || undefined}
    >
      {!disabled && (
        <AnswerRibbon
          editor={editor}
          zoom={zoom}
          onZoom={setZoom}
          onFind={() => undefined}
          onLink={() => setDialog("link")}
          onHelp={() => setDialog("help")}
        />
      )}
      <div className="answer-document-viewport">
        <EditorContent editor={editor} className="answer-document-host" />
      </div>
      {!disabled && dialog === "link" && (
        <AnswerLinkDialog editor={editor} onClose={() => setDialog("")} />
      )}
      {!disabled && dialog === "help" && (
        <AnswerShortcutsDialog onClose={() => setDialog("")} />
      )}
    </div>
  );
}
