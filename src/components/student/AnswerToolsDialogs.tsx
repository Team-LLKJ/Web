import { useState, type FormEvent } from "react";
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
  const [url, setUrl] = useState(editor.getAttributes("link").href || "");
  const [text, setText] = useState(
    editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      " ",
    ),
  );
  const [error, setError] = useState("");
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
    if (editor.state.selection.empty && !editor.isActive("link"))
      editor
        .chain()
        .focus()
        .insertContent(
          `<a href="${escapeHtml(href)}">${escapeHtml(text || url.trim())}</a>`,
        )
        .run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    onClose();
  }
  return (
    <Modal title="링크 넣기" className="answer-tools-modal" onClose={onClose}>
      <form onSubmit={submit}>
        <label>
          표시할 내용
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="링크 표시 내용"
            disabled={!editor.state.selection.empty || editor.isActive("link")}
          />
        </label>
        <label>
          주소
          <input
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            aria-label="링크 주소"
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="answer-dialog-actions">
          {editor.isActive("link") && (
            <Button
              variant="white-danger"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .unsetLink()
                  .run();
                onClose();
              }}
            >
              링크 제거
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">적용</Button>
        </div>
      </form>
    </Modal>
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
    <Modal title="편집 단축키" className="answer-tools-modal" onClose={onClose}>
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
