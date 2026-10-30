import type { AnswerSource, ApiQuestion, Turn } from "../../api/types";
import { Tabs } from "../ui/Tabs";
import { lazy, Suspense } from "react";
import { Skeleton, SkeletonStatus } from "../ui/Skeleton";

const RichAnswerField = lazy(() =>
  import("./RichAnswerField").then((module) => ({
    default: module.RichAnswerField,
  })),
);

function EditorPlaceholder() {
  return (
    <SkeletonStatus
      className="answer-rich-editor"
      label="답안 편집기를 불러오고 있습니다."
    >
      <Skeleton style={{ height: 144, width: "100%" }} />
      <Skeleton style={{ height: 260, width: "100%", marginTop: 12 }} />
    </SkeletonStatus>
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
          <Suspense fallback={<EditorPlaceholder />}>
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
          </Suspense>
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
