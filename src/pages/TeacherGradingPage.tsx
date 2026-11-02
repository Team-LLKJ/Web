import { StudentWorkspace } from "../components/student/StudentWorkspace";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { apiErrorMessage } from "../api/client";
import "../App.css";
import "../components/ui/ui.css";
import { studentReviews } from "../data/review";
import "../components/grading/review.css";
import {
  students as mockStudents,
  questions as mockQuestions,
  type Student,
} from "../data/grading";
import { useGradingData } from "../hooks/useGradingData";
import { Toast } from "../components/teacher/Toast";
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
  const { evaluationId } = useParams();
  const live = useGradingData(evaluationId);
  const isLive = Boolean(evaluationId);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [mockQuestion, setMockQuestion] = useState(mockQuestions[0]?.id ?? 0);
  const [liveQuestion, setLiveQuestion] = useState(1);
  const [tab, setTab] = useState("AI 대화창");
  const [dialog, setDialog] = useState("");
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendCustom, setExtendCustom] = useState("");
  const [extending, setExtending] = useState(false);
  const [notice, setNotice] = useState<{ message: string; tone: "info" | "error" } | null>(null);
  const [mockEnded, setMockEnded] = useState(false);
  const [mockReviews, setMockReviews] = useState(studentReviews);
  const students: Student[] = isLive ? live.students : mockStudents;
  const questions = isLive ? live.questions : mockQuestions;
  const question = isLive ? liveQuestion : mockQuestion;
  const setQuestion = isLive ? setLiveQuestion : setMockQuestion;
  const ended = isLive ? live.ended : mockEnded;
  const liveStudent = students.find((s) => s.id === live.selectedId);
  const student: Student | undefined = isLive
    ? (liveStudent ?? students[0])
    : students[selected];
  const review = isLive
    ? live.review
    : mockReviews[(student as Student).id];
  // 활동·루브릭은 학생이 제출하고 평가가 끝난 뒤에만 열람할 수 있습니다.
  const lockedNotice =
    isLive && !(ended && student?.submittedAt)
      ? !ended
        ? "평가가 진행 중이에요. 평가가 종료된 뒤에 활동 기록과 루브릭을 확인하고 채점할 수 있어요."
        : "이 학생은 아직 제출하지 않았어요. 제출이 확인된 뒤에 확인할 수 있어요."
      : undefined;
  const showLoading = loading || (isLive && live.loading);
  const onScore = (id: string, score: number) => {
    if (isLive) return void live.setScore(id, score);
    const key = (student as Student).id;
    setMockReviews((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        criteria: previous[key].criteria.map((item) =>
          item.id === id ? { ...item, score } : item,
        ),
      },
    }));
  };
  const endNow = () => {
    if (isLive) void live.finishEvaluation();
    else setMockEnded(true);
  };
  if (!student && !showLoading) {
    return (
      <div className="app-shell grading-workspace">
        <Header ended={ended} onDialog={setDialog} onExtend={() => { setExtendCustom(""); setExtendOpen(true); }} />
        <div className="workspace teacher-workspace">
          <p className="empty grading-empty">
            {live.error || "참여한 학생이 아직 없습니다."}
          </p>
        </div>
      </div>
    );
  }
  // 첫 로딩 중에는 학생이 아직 없으므로 자리표시 데이터로 스켈레톤 화면을 그립니다.
  const current: Student = student ?? {
    id: "loading",
    name: "",
    color: "#e5e7eb",
    status: "작성중",
    submittedAt: null,
    answers: [],
    messages: [],
    activities: [],
    rubric: [],
  };
  return (
    <div className="app-shell grading-workspace">
      <Header ended={ended} onDialog={setDialog} onExtend={() => { setExtendCustom(""); setExtendOpen(true); }} />
      {notice ? (
        <Toast message={notice.message} tone={notice.tone} onClose={() => setNotice(null)} />
      ) : null}
      {!notice && isLive && live.events[0] && (
        <Toast
          message={live.events[0].message}
          tone={live.events[0].tone}
          onClose={() => live.dismissEvent(live.events[0].key)}
        />
      )}
      {isLive && live.error && (
        <p className="grading-error" role="alert">
          {live.error}
          <button type="button" onClick={live.clearError}>
            닫기
          </button>
        </p>
      )}
      <div className="workspace teacher-workspace">
        {showLoading ? (
          <StudentSidebarSkeleton />
        ) : (
          <StudentSidebar
            students={students}
            student={current}
            query={query}
            onQuery={setQuery}
            onSelect={(index) => {
              if (isLive) {
                live.select(students[index].id);
                setLiveQuestion(1);
              } else {
                setSelected(index);
                setMockQuestion(mockQuestions[0]?.id ?? 0);
              }
            }}
          />
        )}
        <StudentWorkspace
          className="teacher-content"
          storageKey="lit:teacher-sidebar-width:v2"
          label="학생 평가 사이드바 너비 조절"
          defaultWidth={36}
          editor={
            showLoading ? (
              <SubmissionSkeleton />
            ) : (
              <SubmissionPanel
                student={current}
                questions={questions}
                answers={current.answers}
                question={question}
                onQuestion={setQuestion}
                onSavePdf={isLive ? () => void live.downloadReport() : undefined}
              />
            )
          }
          chat={
            showLoading ? (
              <ReviewSkeleton />
            ) : (
              <ReviewPanel
                student={current}
                messages={current.messages}
                key={current.id}
                review={review}
                onScore={onScore}
                lockedNotice={lockedNotice}
                tab={tab}
                onTab={setTab}
              />
            )
          }
        />
      </div>
      <PrintReport student={current} questions={questions} review={review} />
      {extendOpen && (
        <Modal title="평가 시간 연장" onClose={() => !extending && setExtendOpen(false)}>
          <form
            className="extend-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const minutes = Number(extendCustom);
              if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) {
                setNotice({ message: "1분 ~ 10시간(600분) 사이로 입력해주세요.", tone: "error" });
                return;
              }
              setExtending(true);
              try {
                if (isLive) await live.extendTime(minutes);
                setExtendOpen(false);
                setNotice({ message: `평가 시간을 ${minutes}분 연장했어요.`, tone: "info" });
              } catch (error) {
                setNotice({
                  message: apiErrorMessage(error, "평가 시간을 연장하지 못했습니다."),
                  tone: "error",
                });
              } finally {
                setExtending(false);
              }
            }}
          >
            <p>학생들이 계속 작성할 수 있도록 남은 시간을 늘려요.</p>
            <label className="extend-custom">
              <span>연장할 시간</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="예) 10"
                autoFocus
                value={extendCustom}
                onChange={(event) => setExtendCustom(event.target.value.replace(/\D/g, "").slice(0, 3))}
              />
              <em>분</em>
            </label>
            <div className="extend-actions">
              <Button type="submit" loading={extending}>
                연장하기
              </Button>
              <Button variant="secondary" disabled={extending} onClick={() => setExtendOpen(false)}>
                취소
              </Button>
            </div>
          </form>
        </Modal>
      )}
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
                    endNow();
                    setDialog("");
                  }}
                >
                  평가 종료하기
                </Button>
              )}
              {dialog === "채점 화면에서 나가시겠습니까?" && (
                <Button variant="primary" onClick={() => navigate(isLive ? "/teacher/evaluations" : "/views")}>
                  나가기
                </Button>
              )}
              <Button variant="secondary" onClick={() => setDialog("")}>
                닫기
              </Button>
            </>
          }
        >
          <p>
            {dialog === "평가를 종료하시겠습니까?"
              ? "평가를 종료하면 아직 제출하지 않은 학생의 답안은 그대로 제출 처리되고, 더 이상 작성할 수 없습니다. 정말로 종료하시겠습니까?"
              : "채점 화면에서 나가도 평가는 계속 진행됩니다. 정말로 나가시겠습니까?"}
          </p>
        </Modal>
      )}
    </div>
  );
}
export default TeacherGradingPage;
