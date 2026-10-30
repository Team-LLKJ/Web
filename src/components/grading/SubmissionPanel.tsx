import type { Answer, Question, Student } from "../../data/grading";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { Tabs } from "../ui/Tabs";
type Props = {
  student: Pick<Student, "name" | "color" | "status" | "submittedAt">;
  questions: Question[];
  answers: Answer[];
  question: number;
  onQuestion: (id: number) => void;
};
export function SubmissionPanel({
  student,
  questions,
  answers,
  question,
  onQuestion,
}: Props) {
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
  const paragraphs = answer?.paragraphs.filter((text) => text.trim());
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
      <section className="answer-card">
        <h2>{student.submittedAt ? "제출 답안" : "작성 중인 답안"}</h2>
        <Tabs
          label="문항"
          value={question}
          items={questions.map((item) => ({
            value: item.id,
            label: item.title,
          }))}
          onChange={onQuestion}
        />
        {currentQuestion ? (
          <>
            <section className="question-box">
              <h3>문항 내용</h3>
              <p>{currentQuestion.content}</p>
            </section>
            <section className="response-box">
              <h3>학생 답안</h3>
              {paragraphs?.length ? (
                paragraphs.map((text, index) => <p key={index}>{text}</p>)
              ) : (
                <p className="empty">아직 작성된 답안이 없습니다.</p>
              )}
            </section>
          </>
        ) : (
          <p className="empty">등록된 문항이 없습니다.</p>
        )}
      </section>
    </main>
  );
}
