import { useState } from "react";
import { Button } from "../ui/Button";
import type { DraftQuestion } from "./questionDraft";

export function QuestionFields({
  questions,
  disabled,
  onChange,
  onAdd,
  onRemove,
  onMove,
}: {
  questions: DraftQuestion[];
  disabled: boolean;
  onChange: (key: string, content: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onMove: (key: string, toIndex: number) => void;
}) {
  const [grabbedKey, setGrabbedKey] = useState<string | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  return (
    <div className="teacher-question-fields">
      {questions.map((question, index) => (
        <fieldset
          className={`teacher-question-field${draggingKey === question.key ? " is-dragging" : ""}`}
          key={question.key}
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
          <legend>문항 {index + 1}</legend>
          <button
            className="teacher-drag-handle"
            type="button"
            aria-label={`문항 ${index + 1} 순서 이동 (위/아래 방향키)`}
            title="드래그해서 순서 바꾸기"
            onPointerDown={() => setGrabbedKey(question.key)}
            onPointerUp={() => setGrabbedKey(null)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
              event.preventDefault();
              onMove(question.key, index + (event.key === "ArrowUp" ? -1 : 1));
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
          <textarea
            aria-label={`문항 ${index + 1} 내용`}
            placeholder="문항 내용을 입력하세요"
            maxLength={10000}
            value={question.content}
            onChange={(event) => onChange(question.key, event.target.value)}
          />
          <div className="teacher-question-footer">
            <button
              className="teacher-remove-question"
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
      <Button
        variant="secondary"
        type="button"
        disabled={disabled || questions.length >= 100}
        onClick={onAdd}
      >
        문항 추가
      </Button>
    </div>
  );
}
