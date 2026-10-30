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
  AnswerTableDialog,
  AnswerShortcutsDialog,
} from "./AnswerToolsDialogs";
import { prepareAnswerImage } from "./answerImage";
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
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [zoom, setZoom] = useState("100");
  const [search, setSearch] = useState(false);
  const [dialog, setDialog] = useState<"" | "link" | "table" | "help">("");
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
      handlePaste: (_view, event) => {
        const file = Array.from(event.clipboardData?.files || []).find((f) =>
          f.type.startsWith("image/"),
        );
        if (file) {
          event.preventDefault();
          void addImage(file);
          return true;
        }
        return false;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const file = Array.from(event.dataTransfer?.files || []).find((f) =>
          f.type.startsWith("image/"),
        );
        if (file) {
          event.preventDefault();
          void addImage(file);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e, transaction }) => {
      if (callbacks.current.readOnly || !transaction.docChanged) return;
      const html = sanitizeAnswerHtml(e.getHTML());
      callbacks.current.onChange(questionId, e.isEmpty ? "" : html);
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
  async function addImage(file: File) {
    if (!editor || imageBusy || callbacks.current.readOnly) return;
    setImageBusy(true);
    setMessage("");
    try {
      const src = await prepareAnswerImage(file);
      if (!alive.current || editor.isDestroyed || callbacks.current.readOnly)
        return;
      if (editor.getHTML().length + src.length > MAX_ANSWER_HTML_LENGTH) {
        setMessage(
          "답안에 포함된 이미지가 많습니다. 일부 이미지를 삭제해주세요.",
        );
        return;
      }
      editor
        .chain()
        .focus()
        .setImage({ src, alt: file.name.slice(0, 200) })
        .createParagraphNear()
        .run();
    } catch (error) {
      if (alive.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "이미지를 불러오지 못했습니다.",
        );
    } finally {
      if (alive.current) setImageBusy(false);
    }
  }
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
          <input
            ref={imageInput}
            className="answer-image-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="답안에 넣을 이미지"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void addImage(file);
            }}
          />
          <AnswerRibbon
            editor={editor}
            imageBusy={imageBusy}
            zoom={zoom}
            onZoom={setZoom}
            onFind={() => setSearch((v) => !v)}
            onLink={() => setDialog("link")}
            onTable={() => setDialog("table")}
            onImage={() => imageInput.current?.click()}
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
        readOnly={readOnly}
      />
      {!readOnly && dialog === "link" && (
        <AnswerLinkDialog editor={editor} onClose={() => setDialog("")} />
      )}
      {!readOnly && dialog === "table" && (
        <AnswerTableDialog editor={editor} onClose={() => setDialog("")} />
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
  readOnly,
}: {
  editor: Editor;
  message: string;
  saving: boolean;
  notice: string;
  readOnly: boolean;
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
        {message ||
          (saving
            ? "저장 중…"
            : notice ||
              (!readOnly ? "입력 후 다른 영역을 누르면 저장됩니다." : ""))}
      </span>
      <span>
        {stats?.selected ? `선택 ${stats.selected}자 · ` : ""}
        {stats?.words || 0}단어 · {stats?.characters || 0} /{" "}
        {MAX_ANSWER_LENGTH.toLocaleString()}자
      </span>
    </div>
  );
}
