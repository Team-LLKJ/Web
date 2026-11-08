import { Skeleton, SkeletonStatus } from "../ui/Skeleton";
import { questionText } from "../../lib/questionLimit";
import { EmptyState } from "../ui/EmptyState";
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { clearAuthorMark, markAuthorship } from "./authorshipMark";
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
  /** 지정하면 답안에서 학생이 쓴 문장(student) 또는 AI 답변과 비슷한 문장(ai)에 줄을 칩니다. */
  authorMark?: "student" | "ai" | "paste" | null;
  /** 겹침을 비교할 AI 답변들 */
  aiTexts?: string[];
  /** 학생이 AI에게 보낸 질문들. AI가 되풀이한 학생 글을 AI의 글로 잘못 세지 않는 데 씁니다. */
  userTexts?: string[];
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
  authorMark = null,
  aiTexts = [],
  userTexts = [],
}: Props) {
  const [markCount, setMarkCount] = useState<number | null>(null);
  const userKey = userTexts.join("\u0001");
  const [saveOpen, setSaveOpen] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);
  const aiKey = aiTexts.join("\u0001");
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
  // 학생이 쓴 부분 / AI 답변과 비슷한 부분에 줄을 칩니다. 편집기는 늦게 그려지므로 잠시 뒤 다시 적용합니다.
  useEffect(() => {
    const root = answerRef.current;
    if (!root || !authorMark) return clearAuthorMark();
    const apply = () => {
      const text = root.querySelector<HTMLElement>(".tiptap") ?? root;
      setMarkCount(
        markAuthorship(
          text,
          aiKey ? aiKey.split("\u0001") : [],
          authorMark,
          userKey ? userKey.split("\u0001") : [],
        ),
      );
    };
    apply();
    const timers = [window.setTimeout(apply, 300), window.setTimeout(apply, 900)];
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      clearAuthorMark();
    };
  }, [authorMark, aiKey, userKey, question, student.name]);
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
              <p>{questionText(currentQuestion.content, currentQuestion.minChars, currentQuestion.maxChars)}</p>
            </section>
            {authorMark && markCount === 0 && answerContent.trim() && (
              <p className="author-mark-note">
                표시할 문장이 없어요. 이 문항의 문장이 모두 다른 구분으로 분류됐어요.
              </p>
            )}
            <div ref={answerRef}>
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
            </div>
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
