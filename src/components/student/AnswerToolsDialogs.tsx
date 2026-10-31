import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { Editor } from "@tiptap/react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { escapeHtml } from "./answerHtml";

export function AnswerLinkDialog({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const hasLink = editor.isActive("link");
  const emptySelection = editor.state.selection.empty && !hasLink;
  const [url, setUrl] = useState(editor.getAttributes("link").href || "");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const { from, to } = editor.state.selection;
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    const width = ref.current?.offsetWidth ?? 320;
    const height = ref.current?.offsetHeight ?? 48;
    const left = Math.max(
      8,
      Math.min(start.left, window.innerWidth - width - 8),
    );
    const below = end.bottom + 6;
    const top =
      below + height > window.innerHeight - 8
        ? Math.max(8, start.top - height - 6)
        : below;
    setPos({ left, top });
  }, [editor]);
  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  function submit(event: FormEvent) {
    event.preventDefault();
    let href = url.trim();
    if (!/^[a-z][a-z\d+.-]*:/i.test(href)) href = "https://" + href;
    try {
      const parsed = new URL(href);
      if (
        !["http:", "https:", "mailto:"].includes(parsed.protocol) ||
        !url.trim()
      )
        throw new Error();
    } catch {
      setError("http, https 또는 mailto 주소를 입력해주세요.");
      return;
    }
    if (emptySelection)
      editor
        .chain()
        .focus()
        .insertContent(
          `<a href="${escapeHtml(href)}">${escapeHtml(text.trim() || url.trim())}</a>`,
        )
        .run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    onClose();
  }
  return (
    <form
      ref={ref}
      className="link-popover"
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        visibility: pos ? "visible" : "hidden",
      }}
      onSubmit={submit}
    >
      {emptySelection && (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="텍스트"
          aria-label="링크 표시 내용"
        />
      )}
      <div className="link-popover-row">
        <input
          autoFocus
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError("");
          }}
          placeholder="링크 붙여넣기"
          aria-label="링크 주소"
        />
        {hasLink && (
          <button
            type="button"
            className="link-popover-remove"
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              onClose();
            }}
          >
            제거
          </button>
        )}
        <button type="submit" className="link-popover-apply" disabled={!url.trim()}>
          적용
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
export function AnswerShortcutsDialog({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    ["굵게", "Ctrl/⌘ B"],
    ["기울임", "Ctrl/⌘ I"],
    ["밑줄", "Ctrl/⌘ U"],
    ["실행 취소", "Ctrl/⌘ Z"],
    ["다시 실행", "Ctrl/⌘ Shift Z"],
    ["찾기·바꾸기", "Ctrl/⌘ F"],
    ["표의 다음 셀 / 마지막 셀에서 행 추가", "Tab"],
    ["표의 이전 셀", "Shift Tab"],
    ["문단 안에서 줄 바꿈", "Shift Enter"],
  ];
  return (
    <Modal
      title="편집 단축키"
      className="answer-tools-modal"
      onClose={onClose}
      actions={<Button onClick={onClose}>확인</Button>}
    >
      <dl className="answer-shortcuts">
        {shortcuts.map(([label, key]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <kbd>{key}</kbd>
            </dd>
          </div>
        ))}
      </dl>
      <p className="answer-editor-help">
        이미지를 선택하면 모서리에서 크기를 조절할 수 있고, 표의 열 경계선을
        드래그하면 너비가 바뀝니다.
      </p>
    </Modal>
  );
}
