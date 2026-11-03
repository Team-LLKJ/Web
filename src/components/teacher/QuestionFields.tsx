import { useState } from "react";
import type { DraftQuestion } from "./questionDraft";

export function QuestionFields({
  questions,
  disabled,
  onChange,
  onLimitChange,
  onAdd,
  onRemove,
  onMove,
  showAdd = true,
  errorKey = null,
  errorMessage = "",
}: {
  questions: DraftQuestion[];
  disabled: boolean;
  onChange: (key: string, content: string) => void;
  onLimitChange: (
    key: string,
    field: "minChars" | "maxChars",
    value: string,
  ) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onMove: (key: string, toIndex: number) => void;
  /** false면 하단 "문항 추가" 버튼을 그리지 않습니다(바깥에서 따로 둘 때). */
  showAdd?: boolean;
  /** 오류를 표시할 문항 key (입력창 아래에 메시지를 보여 줍니다). */
  errorKey?: string | null;
  errorMessage?: string;
}) {
  const [grabbedKey, setGrabbedKey] = useState<string | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  // 글자 수 제한을 켠 문항(값이 이미 있는 문항은 자동으로 켜진 상태로 봅니다).
  const [limitOpen, setLimitOpen] = useState<Set<string>>(new Set());
  return (
    <>
      <div className="tq-list">
        {questions.map((question, index) => (
          <fieldset
            className={`tq-card${draggingKey === question.key ? " is-dragging" : ""}`}
            key={question.key}
            data-question-key={question.key}
            disabled={disabled}
            draggable={!disabled && grabbedKey === question.key}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              setDraggingKey(question.key);
            }}
            onDragOver={(event) => {
              if (!draggingKey) return;
              event.preventDefault();
              if (draggingKey !== question.key) onMove(draggingKey, index);
            }}
            onDrop={(event) => event.preventDefault()}
            onDragEnd={() => {
              setDraggingKey(null);
              setGrabbedKey(null);
            }}
          >
            <legend className="sr-only">문항 {index + 1}</legend>
            <div className="tq-head">
              <h3 className="tq-title">문항 {index + 1}</h3>
              <button
                className="tq-handle"
                type="button"
                aria-label={`문항 ${index + 1} 순서 이동 (위/아래 방향키)`}
                title="드래그해서 순서 바꾸기"
                onPointerDown={() => setGrabbedKey(question.key)}
                onPointerUp={() => setGrabbedKey(null)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown")
                    return;
                  event.preventDefault();
                  onMove(
                    question.key,
                    index + (event.key === "ArrowUp" ? -1 : 1),
                  );
                }}
              >
                <svg
                  width="20"
                  height="12"
                  viewBox="0 0 20 12"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  {[4, 10, 16].flatMap((x) =>
                    [3, 9].map((y) => (
                      <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />
                    )),
                  )}
                </svg>
              </button>
            </div>
            <textarea
              aria-label={`문항 ${index + 1} 내용`}
              placeholder="문항 내용을 입력하세요"
              maxLength={10000}
              value={question.content}
              aria-invalid={errorKey === question.key}
              onChange={(event) => onChange(question.key, event.target.value)}
            />
            {errorKey === question.key && errorMessage && (
              <p className="input-error tq-error">{errorMessage}</p>
            )}
            <div className="tq-foot">
              {(() => {
                const open =
                  limitOpen.has(question.key) ||
                  Boolean(question.minChars || question.maxChars);
                return (
                  <div
                    className="teacher-question-limits"
                    role="group"
                    aria-label={`문항 ${index + 1} 글자 수 제한`}
                  >
                    <label className="teacher-limit-toggle">
                      <input
                        type="checkbox"
                        checked={open}
                        onChange={(event) => {
                          const on = event.target.checked;
                          setLimitOpen((current) => {
                            const next = new Set(current);
                            if (on) next.add(question.key);
                            else next.delete(question.key);
                            return next;
                          });
                          if (!on) {
                            onLimitChange(question.key, "minChars", "");
                            onLimitChange(question.key, "maxChars", "");
                          }
                        }}
                      />
                      <span>글자 수 제한</span>
                    </label>
                    {open && (
                      <span className="teacher-limit-fields">
                        {(["minChars", "maxChars"] as const).map((field, i) => (
                          <span className="teacher-limit-item" key={field}>
                            {i === 1 && <i aria-hidden="true">~</i>}
                            <span className="teacher-limit-input">
                              <b>{field === "minChars" ? "최소" : "최대"}</b>
                              <input
                                type="text"
                                inputMode="numeric"
                                aria-label={
                                  field === "minChars"
                                    ? "최소 글자 수"
                                    : "최대 글자 수"
                                }
                                placeholder="제한 없음"
                                value={question[field]}
                                onChange={(event) =>
                                  onLimitChange(
                                    question.key,
                                    field,
                                    event.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 5),
                                  )
                                }
                              />
                              <em>자</em>
                            </span>
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })()}
              <button
                className="tq-remove"
                type="button"
                aria-label={`문항 ${index + 1} 삭제`}
                title="삭제"
                disabled={questions.length <= 1}
                onClick={() => onRemove(question.key)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M6 7l1 13h10l1-13" />
                  <path d="M9 7V4h6v3" />
                </svg>
              </button>
            </div>
          </fieldset>
        ))}
      </div>
      {showAdd && (
        <button
          className="tq-add"
          type="button"
          disabled={disabled || questions.length >= 100}
          onClick={onAdd}
        >
          문항 추가
        </button>
      )}
    </>
  );
}
