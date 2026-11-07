import { Skeleton, SkeletonStatus } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { ReportSaveDialog } from "./ReportSaveDialog";
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
  /** 지정하면 서버 보고서(PDF·HWP)를 내려받습니다. 둘은 같은 서버 보고서예요. */
  onSaveReport?: (format: "pdf" | "hwp") => Promise<void> | void;
  /** 지정하면 저장 창에서 서버 PDF 미리보기를 보여줍니다. */
  onPreviewReport?: () => Promise<Blob>;
  /** 서버가 없을 때 저장 창 미리보기에 보여줄 앱 보고서 */
  report?: ReactNode;
};
export function SubmissionPanel({
  student,
  questions,
  answers,
  question,
  onQuestion,
  onSaveReport,
  onPreviewReport,
  report,
}: Props) {
  const [saveOpen, setSaveOpen] = useState(false);
  // 인쇄 창의 기본 파일 이름과 제목이 보고서 이름이 되도록 잠시 문서 제목을 바꾼다.
  const savePdf = () => {
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
        <div className="student-summary-actions">
          <Button variant="primary" onClick={() => setSaveOpen(true)}>
            저장하기
          </Button>
        </div>
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
      {saveOpen && (
        <ReportSaveDialog
          studentName={student.name}
          hwp={Boolean(onSaveReport)}
          loadPreview={onPreviewReport}
          report={report}
          onSave={(format) => (onSaveReport ? onSaveReport(format) : savePdf())}
          onClose={() => setSaveOpen(false)}
        />
      )}
    </main>
  );
}
