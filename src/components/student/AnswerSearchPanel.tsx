import { useEffect, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { answerSearchKey, getAnswerSearch } from "./answerSearch";

export function AnswerSearchPanel({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [result, setResult] = useState("");
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const search = getAnswerSearch(e.state);
      return { count: search?.matches.length || 0, index: search?.index || 0 };
    },
  });
  useEffect(() => {
    editor.view.dispatch(
      editor.state.tr.setMeta(answerSearchKey, { query, matchCase, index: 0 }),
    );
    return () => {
      if (!editor.isDestroyed)
        editor.view.dispatch(
          editor.state.tr.setMeta(answerSearchKey, { query: "", index: 0 }),
        );
    };
  }, [editor, query, matchCase]);
  function go(direction: number) {
    const search = getAnswerSearch(editor.state);
    if (!search?.matches.length) return;
    const index =
      (search.index + direction + search.matches.length) %
      search.matches.length;
    const match = search.matches[index];
    editor.chain().focus().setTextSelection(match).scrollIntoView().run();
    editor.view.dispatch(editor.state.tr.setMeta(answerSearchKey, { index }));
  }
  function replace(all: boolean) {
    const search = getAnswerSearch(editor.state);
    if (!search?.matches.length || !editor.isEditable) return;
    const matches = all ? search.matches : [search.matches[search.index]];
    let transaction = editor.state.tr;
    for (const match of [...matches].reverse())
      transaction = transaction.insertText(replacement, match.from, match.to);
    editor.view.dispatch(transaction);
    setResult(
      editor.state.doc.eq(transaction.doc)
        ? `${matches.length}곳을 바꿨습니다.`
        : "답안 글자 수 제한 때문에 바꾸지 못했습니다.",
    );
  }
  return (
    <section className="answer-find-panel" aria-label="찾기 및 바꾸기">
      <div className="answer-find-row">
        <input
          autoFocus
          aria-label="찾을 내용"
          placeholder="찾을 내용"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResult("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              go(e.shiftKey ? -1 : 1);
            }
            if (e.key === "Escape") onClose();
          }}
        />
        <span role="status">
          {query
            ? state.count
              ? `${state.index + 1} / ${state.count}`
              : "검색 결과 없음"
            : "내용을 입력하세요"}
        </span>
        <button type="button" disabled={!state.count} onClick={() => go(-1)}>
          이전
        </button>
        <button type="button" disabled={!state.count} onClick={() => go(1)}>
          다음
        </button>
        <button type="button" aria-label="찾기 닫기" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="answer-find-row">
        <input
          aria-label="바꿀 내용"
          placeholder="바꿀 내용"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
        />
        <button
          type="button"
          disabled={!state.count || !editor.isEditable}
          onClick={() => replace(false)}
        >
          바꾸기
        </button>
        <button
          type="button"
          disabled={!state.count || !editor.isEditable}
          onClick={() => replace(true)}
        >
          모두 바꾸기
        </button>
        <label>
          <input
            type="checkbox"
            checked={matchCase}
            onChange={(e) => setMatchCase(e.target.checked)}
          />
          대소문자 구분
        </label>
      </div>
      {result && <p role="status">{result}</p>}
    </section>
  );
}
