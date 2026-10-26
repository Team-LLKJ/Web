import type { Question } from "../../data/grading";
import { Tabs } from "../ui/Tabs";
export function AnswerEditor({
  questions,
  questionId,
  answers,
  readOnly,
  onQuestion,
  onAnswer,
}: {
  questions: Question[];
  questionId: number;
  answers: Record<number, string>;
  readOnly: boolean;
  onQuestion: (id: number) => void;
  onAnswer: (id: number, text: string) => void;
}) {
  const question = questions.find((item) => item.id === questionId);
  return (
    <section className="student-editor">
      <h1>{readOnly ? "제출 답안" : "답안 작성"}</h1>
      {readOnly && (
        <p className="submission-lock-notice" role="status">
          제출 완료 · 답안을 수정할 수 없습니다.
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
          <textarea
            aria-label={`${question.title} 답안`}
            placeholder="답안을 작성하세요."
            value={answers[questionId] || ""}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => {
              if (!readOnly) onAnswer(questionId, e.target.value);
            }}
          />
        </>
      ) : (
        <p className="empty">등록된 문항이 없습니다.</p>
      )}
    </section>
  );
}
