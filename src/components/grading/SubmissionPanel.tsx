import { Skeleton, SkeletonStatus } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { lazy, Suspense } from "react";
import type { Answer, Question, Student } from "../../data/grading";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { Tabs } from "../ui/Tabs";
// 학생 답안 화면과 같은 읽기 전용 편집기를 그대로 사용합니다.
const RichAnswerField = lazy(() =>
  import("../student/RichAnswerField").then((module) => ({
    default: module.RichAnswerField,
  })),
);
const noop = () => undefined;

type Props = {
  student: Pick<Student, "name" | "color" | "status" | "submittedAt">;
  questions: Question[];
  answers: Answer[];
  question: number;
  onQuestion: (id: number) => void;
  /** 지정하면 브라우저 인쇄 대신 서버 PDF를 내려받습니다. */
  onSavePdf?: () => void;
};
export function SubmissionPanel({
  student,
  questions,
  answers,
  question,
  onQuestion,
  onSavePdf,
}: Props) {
  // 인쇄 창의 기본 파일 이름과 제목이 보고서 이름이 되도록 잠시 문서 제목을 바꾼다.
  const savePdf = () => {
    if (onSavePdf) return onSavePdf();
    const previous = document.title;
    document.title = `${student.name} 학습 보고서`;
    window.addEventListener("afterprint", () => (document.title = previous), {
      once: true,
    });
    window.print();
  };
  const currentQuestion = questions.find((item) => item.id === question);
  const answer = answers.find((item) => item.questionId === question);
  const answerContent =
    answer?.html ?? answer?.paragraphs.filter((text) => text.trim()).join("\n\n") ?? "";
  return (
    <main className="answer-area">
      <section className="student-summary">
        <div className="identity">
          <Avatar name={student.name} size="large" />
          <div>
            <h1>{student.name}</h1>
            <p>
              {student.submittedAt
                ? `${student.submittedAt} 제출`
                : student.status}
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={savePdf}>
          PDF로 저장하기
        </Button>
      </section>
      <section className="answer-card teacher-submission">
        <h2>{student.submittedAt ? "제출 답안" : "작성 중인 답안"}</h2>
        {questions.length > 1 && (
        <Tabs
          label="문항"
          variant="segment"
          value={question}
          items={questions.map((item) => ({
            value: item.id,
            label: item.title,
          }))}
          onChange={onQuestion}
        />
        )}
        {currentQuestion ? (
          <>
            <section className="question-box teacher-question">
              <p>{currentQuestion.content}</p>
            </section>
            <Suspense
              fallback={
                <SkeletonStatus label="답안을 불러오는 중" className="answer-skeleton">
                  <Skeleton style={{ width: "100%", height: 18 }} />
                  <Skeleton style={{ width: "92%", height: 18 }} />
                  <Skeleton style={{ width: "70%", height: 18 }} />
                </SkeletonStatus>
              }
            >
              <RichAnswerField
                key={`${student.name}-${currentQuestion.id}-${answerContent.length}-${answerContent.slice(-40)}`}
                questionId={String(currentQuestion.id)}
                questionTitle={currentQuestion.title}
                content={answerContent}
                readOnly
                saving={false}
                notice=""
                onChange={noop}
                onBlur={noop}
              />
            </Suspense>
          </>
        ) : (
          <EmptyState size="inline" icon="doc" title="등록된 문항이 없어요" />
        )}
      </section>
    </main>
  );
}
