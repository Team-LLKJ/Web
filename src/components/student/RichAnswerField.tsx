import { useEffect, useRef, useState } from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import { Skeleton, SkeletonStatus } from "../ui/Skeleton";
import { answerExtensions } from "./answerExtensions";
import {
  editorHtmlFromContent,
  sanitizeAnswerHtml,
  MAX_ANSWER_LENGTH,
  MAX_ANSWER_HTML_LENGTH,
} from "./answerHtml";
import { AnswerRibbon } from "./AnswerRibbon";
import { AnswerSearchPanel } from "./AnswerSearchPanel";
import {
  AnswerLinkDialog,
  AnswerShortcutsDialog,
} from "./AnswerToolsDialogs";
import "./docs-editor.css";

type Props = {
  questionId: string;
  questionTitle: string;
  content: string;
  readOnly: boolean;
  saving: boolean;
  notice: string;
  onChange: (id: string, html: string) => void;
  onBlur: () => void;
};
export function RichAnswerField({
  questionId,
  questionTitle,
  content,
  readOnly,
  saving,
  notice,
  onChange,
  onBlur,
}: Props) {
  const callbacks = useRef({ onChange, onBlur, readOnly });
  useEffect(() => {
    callbacks.current = { onChange, onBlur, readOnly };
  }, [onChange, onBlur, readOnly]);
  const [initialHtml] = useState(() => editorHtmlFromContent(content));
  const [message, setMessage] = useState("");
  const [zoom, setZoom] = useState("100");
  const [search, setSearch] = useState(false);
  const [dialog, setDialog] = useState<"" | "link" | "help">("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const editor: Editor | null = useEditor({
    extensions: answerExtensions(),
    content: initialHtml,
    editable: !readOnly,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: "student-answer-content",
        role: "textbox",
        "aria-label": `${questionTitle} 답안`,
        "aria-multiline": "true",
        "aria-readonly": String(readOnly),
      },
      transformPastedHTML: (html) =>
        html.length <= MAX_ANSWER_HTML_LENGTH ? sanitizeAnswerHtml(html) : "",
      handleKeyDown: (_view, event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          ["f", "h"].includes(event.key.toLowerCase())
        ) {
          event.preventDefault();
          setSearch(true);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e, transaction }) => {
      if (callbacks.current.readOnly || !transaction.docChanged) return;
      const html = sanitizeAnswerHtml(e.getHTML());
      // 빈 셀만 있는 표도 내용으로 취급해야 하므로 e.isEmpty 대신 sanitize 결과를 그대로 쓴다.
      callbacks.current.onChange(questionId, html);
      setMessage("");
    },
  });
  useEffect(() => {
    if (editor && editor.isEditable === readOnly) editor.setEditable(!readOnly);
    editor?.setOptions({
      editorProps: {
        attributes: {
          class: "student-answer-content",
          role: "textbox",
          "aria-label": `${questionTitle} 답안`,
          "aria-multiline": "true",
          "aria-readonly": String(readOnly),
        },
      },
    });
  }, [editor, readOnly, questionTitle]);
  if (!editor)
    return (
      <SkeletonStatus
        className="answer-rich-editor"
        label="답안 편집기를 준비하고 있습니다."
      >
        <Skeleton style={{ height: 144, width: "100%" }} />
        <Skeleton style={{ height: 260, width: "100%", marginTop: 12 }} />
      </SkeletonStatus>
    );
  return (
    <div
      className="answer-rich-editor"
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget) &&
          !callbacks.current.readOnly
        )
          callbacks.current.onBlur();
      }}
    >
      {!readOnly && (
        <>
          <AnswerRibbon
            editor={editor}
            zoom={zoom}
            onZoom={setZoom}
            onFind={() => setSearch((v) => !v)}
            onLink={() => setDialog("link")}
            onHelp={() => setDialog("help")}
          />
        </>
      )}
      {search && (
        <AnswerSearchPanel editor={editor} onClose={() => setSearch(false)} />
      )}
      <div
        className="answer-document-viewport"
        style={
          {
            "--answer-editor-zoom": String(Number(zoom) / 100),
          } as React.CSSProperties
        }
      >
        <EditorContent editor={editor} className="answer-document-host" />
      </div>
      <AnswerStatus
        editor={editor}
        message={message}
        saving={saving}
        notice={notice}
      />
      {!readOnly && dialog === "link" && (
        <AnswerLinkDialog editor={editor} onClose={() => setDialog("")} />
      )}
      {!readOnly && dialog === "help" && (
        <AnswerShortcutsDialog onClose={() => setDialog("")} />
      )}
    </div>
  );
}

function AnswerStatus({
  editor,
  message,
  saving,
  notice,
}: {
  editor: Editor;
  message: string;
  saving: boolean;
  notice: string;
}) {
  const stats = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      characters: e.storage.characterCount.characters() || 0,
      words: e.storage.characterCount.words() || 0,
      selected: e.state.doc.textBetween(
        e.state.selection.from,
        e.state.selection.to,
        " ",
      ).length,
    }),
  });
  return (
    <div className="answer-rich-status" aria-live="polite">
      <span>
        {message || (saving ? "저장 중…" : notice)}
      </span>
      <span>
        {stats?.selected ? `선택 ${stats.selected}자 · ` : ""}
        {stats?.words || 0}단어 · {stats?.characters || 0} /{" "}
        {MAX_ANSWER_LENGTH.toLocaleString()}자
      </span>
    </div>
  );
}
