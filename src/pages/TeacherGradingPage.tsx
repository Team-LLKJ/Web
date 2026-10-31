import { StudentWorkspace } from "../components/student/StudentWorkspace";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import "../App.css";
import "../components/ui/ui.css";
import { studentReviews } from "../data/review";
import "../components/grading/review.css";
import { students, questions } from "../data/grading";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Header } from "../components/grading/Header";
import { StudentSidebar } from "../components/grading/StudentSidebar";
import { SubmissionPanel } from "../components/grading/SubmissionPanel";
import { ReviewPanel } from "../components/grading/ReviewPanel";
import { PrintReport } from "../components/grading/PrintReport";
import {
  ReviewSkeleton,
  StudentSidebarSkeleton,
  SubmissionSkeleton,
} from "../components/grading/GradingSkeleton";
function TeacherGradingPage() {
  const navigate = useNavigate();
  // 실제 API 연결 전까지는 ?loading=1 로 스켈레톤 화면을 미리 볼 수 있다.
  const loading = useSearchParams()[0].get("loading") === "1";
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [question, setQuestion] = useState(questions[0]?.id ?? 0);
  const [tab, setTab] = useState("AI 대화창");
  const [dialog, setDialog] = useState("");
  const [ended, setEnded] = useState(false);
  const student = students[selected];
  const [reviews, setReviews] = useState(studentReviews);
  const review = reviews[student.id];
  return (
    <div className="app-shell grading-workspace">
      <Header ended={ended} onDialog={setDialog} />
      <div className="workspace teacher-workspace">
        {loading ? (
          <StudentSidebarSkeleton />
        ) : (
        <StudentSidebar
          students={students}
          student={student}
          query={query}
          onQuery={setQuery}
          onSelect={(index) => {
            setSelected(index);
            setQuestion(questions[0]?.id ?? 0);
          }}
        />
        )}
        <StudentWorkspace
          className="teacher-content"
          storageKey="lit:teacher-sidebar-width:v2"
          label="학생 평가 사이드바 너비 조절"
          defaultWidth={36}
          editor={
            loading ? <SubmissionSkeleton /> : (
            <SubmissionPanel
              student={student}
              questions={questions}
              answers={student.answers}
              question={question}
              onQuestion={setQuestion}
            />
            )
          }
          chat={
            loading ? <ReviewSkeleton /> : (
            <ReviewPanel
              student={student}
              messages={student.messages}
              key={student.id}
              review={review}
              onScore={(id, score) =>
                setReviews((previous) => ({
                  ...previous,
                  [student.id]: {
                    ...previous[student.id],
                    criteria: previous[student.id].criteria.map((item) =>
                      item.id === id ? { ...item, score } : item,
                    ),
                  },
                }))
              }
              tab={tab}
              onTab={setTab}
            />
            )
          }
        />
      </div>
      <PrintReport student={student} questions={questions} review={review} />
      {dialog && (
        <Modal
          title={dialog}
          onClose={() => setDialog("")}
          actions={
            <>
              {dialog === "평가를 종료하시겠습니까?" && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setEnded(true);
                    setDialog("");
                  }}
                >
                  평가 종료하기
                </Button>
              )}
              {dialog === "채점 화면에서 나가시겠습니까?" && (
                <Button variant="primary" onClick={() => navigate("/views")}>
                  나가기
                </Button>
              )}
              <Button variant="secondary" onClick={() => setDialog("")}>
                닫기
              </Button>
            </>
          }
        >
        </Modal>
      )}
    </div>
  );
}
export default TeacherGradingPage;
