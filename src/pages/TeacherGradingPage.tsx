import { PageLoading } from "../components/ui/PageLoading";
import { StudentWorkspace } from "../components/student/StudentWorkspace";
import { EmptyState } from "../components/ui/EmptyState";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ApiError, apiErrorMessage } from "../api/client";
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
import { DurationPicker } from "../components/teacher/DurationPicker";
import { EvaluationControls } from "../components/ui/EvaluationControls";
import { StudentSidebar } from "../components/grading/StudentSidebar";
import { readStudentsWidth } from "../components/grading/sidebarWidth";
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
  const [studentsWidth, setStudentsWidth] = useState(readStudentsWidth);
  const [selected, setSelected] = useState(0);
  // 좁은 화면: 학생 목록에서 학생을 누르면 답안·루브릭 화면으로 넘어갑니다.
  const [mobileDetail, setMobileDetail] = useState(false);
  const [mobilePane, setMobilePane] = useState<"answer" | "review">("answer");
  const workspaceRef = useRef<HTMLDivElement>(null);

  // 모바일에서 답안 ↔ 대화·활동·루브릭을 옆으로 밀면 위쪽 전환 막대도 같이 바뀝니다.
  useEffect(() => {
    if (!mobileDetail) return;
    const content = workspaceRef.current?.querySelector<HTMLElement>(".teacher-content");
    if (!content) return;
    const sync = () => {
      setMobilePane(content.scrollLeft > content.clientWidth / 2 ? "review" : "answer");
    };
    content.addEventListener("scroll", sync, { passive: true });
    return () => content.removeEventListener("scroll", sync);
  }, [mobileDetail]);

  const showMobilePane = (pane: "answer" | "review") => {
    const content = workspaceRef.current?.querySelector<HTMLElement>(".teacher-content");
    setMobilePane(pane);
    content?.scrollTo({ left: pane === "review" ? content.scrollWidth : 0, behavior: "smooth" });
  };
  const [mockQuestion, setMockQuestion] = useState(mockQuestions[0]?.id ?? 0);
  const [liveQuestion, setLiveQuestion] = useState(1);
  const [tab, setTab] = useState("AI 대화창");
  // 활동 탭의 기여도 범례를 눌러 답안에 줄을 쳐 보는 종류
  const [authorMark, setAuthorMark] = useState<"student" | "ai" | "paste" | null>(null);
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
  // 학생 목록을 처음 불러올 때만 화면 전체를 로딩으로 덮고, 학생을 옮길 때는 목록을 그대로 둡니다.
  const listLoading = loading || (isLive && live.listLoading);
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
    if (isLive) {
      // 종료에 성공하면 이 화면에서 나갑니다.
      void live.finishEvaluation().then((done) => {
        if (done) navigate("/teacher/evaluations");
      });
    } else setMockEnded(true);
  };
  if (!student && !showLoading) {
    return (
      <div className="app-shell grading-workspace">
        <Header ended={ended} />
        <div className="workspace teacher-workspace">
          {live.error ? (
            <EmptyState
              className="workspace-empty"
              icon="alert"
              title="평가를 불러오지 못했어요"
              description={live.error}
              action={
                <Link className="button button--secondary neutral" to="/teacher/folders">
                  내 수행평가로
                </Link>
              }
            />
          ) : (
            <EmptyState
              className="workspace-empty"
              icon="users"
              title="참여한 학생이 아직 없어요"
              description="학생이 참여해 답안을 작성하면 여기에서 채점할 수 있어요."
            />
          )}
        </div>
      </div>
    );
  }
  if (listLoading) return <PageLoading layout="grading" />;

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
      <Header ended={ended} />
      {notice ? (
        <Toast message={notice.message} tone={notice.tone} onClose={() => setNotice(null)} />
      ) : null}
      {!notice && isLive && live.error && (
        <Toast message={live.error} onClose={live.clearError} />
      )}
      {!notice && isLive && !live.error && live.events[0] && (
        <Toast
          message={live.events[0].message}
          tone={live.events[0].tone}
          onClose={() => live.dismissEvent(live.events[0].key)}
        />
      )}
      <div
        ref={workspaceRef}
        className="workspace teacher-workspace"
        data-mobile-view={mobileDetail ? "detail" : "list"}
        style={{ "--students-width": `${studentsWidth}px` } as CSSProperties}
      >
        {listLoading ? (
          <StudentSidebarSkeleton />
        ) : (
          <StudentSidebar
            students={students}
            student={current}
            query={query}
            onQuery={setQuery}
            width={studentsWidth}
            onWidth={setStudentsWidth}
            top={
              ended ? null : (
                <EvaluationControls
                  endInfo={isLive ? live.endInfo : null}
                  onExtend={() => { setExtendCustom(""); setExtendOpen(true); }}
                  onEnd={() => setDialog("평가를 종료하시겠습니까?")}
                />
              )
            }
            onSelect={(index) => {
              setMobileDetail(true);
              setMobilePane("answer");
              window.scrollTo({ top: 0 });
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
        <div className="grading-mobile-bar">
          <button
            type="button"
            className="grading-mobile-back"
            aria-label="뒤로가기"
            onClick={() => {
              setMobileDetail(false);
              window.scrollTo({ top: 0 });
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            뒤로가기
          </button>
          <div className="grading-mobile-pager" role="group" aria-label="채점 화면 전환">
            <button type="button" aria-pressed={mobilePane === "answer"} onClick={() => showMobilePane("answer")}>
              답안
            </button>
            <button type="button" aria-pressed={mobilePane === "review"} onClick={() => showMobilePane("review")}>
              루브릭·대화
            </button>
          </div>
        </div>
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
                onSaveReport={isLive ? (format) => live.downloadReport(format) : undefined}
                onPreviewReport={isLive ? live.previewReport : undefined}
                report={<PrintReport student={current} questions={questions} review={review} />}
                authorMark={authorMark}
                aiTexts={current.messages.filter((m) => m.role === "ai").map((m) => m.content)}
                userTexts={current.messages.filter((m) => m.role === "user").map((m) => m.content)}
              />
            )
          }
          chat={
            showLoading ? (
              <ReviewSkeleton tab={tab} onTab={setTab} />
            ) : (
              <ReviewPanel
                student={current}
                messages={current.messages}
                key={current.id}
                review={review}
                onScore={onScore}
                onLevel={isLive ? (id, level) => void live.setLevel(id, level) : undefined}
                onFeedback={isLive ? (id, text) => void live.setFeedback(id, text) : undefined}
                onConfirm={isLive ? () => live.confirmGrading() : undefined}
                lockedNotice={lockedNotice}
                tab={tab}
                onTab={setTab}
                authorMark={authorMark}
                onAuthorMark={setAuthorMark}
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
                  message:
                    error instanceof ApiError && error.code === "EVALUATION_NOT_RUNNING"
                      ? "진행 중인 평가만 시간을 연장할 수 있어요."
                      : apiErrorMessage(error, "평가 시간을 연장하지 못했습니다."),
                  tone: "error",
                });
              } finally {
                setExtending(false);
              }
            }}
          >
            <p>학생들이 계속 작성할 수 있도록 남은 시간을 늘려요.</p>
            <div className="extend-custom">
              <span>연장할 시간</span>
              <DurationPicker
                hours={Math.floor((Number(extendCustom) || 0) / 60)}
                minutes={(Number(extendCustom) || 0) % 60}
                disabled={extending}
                onChange={(h, m) => setExtendCustom(String(h * 60 + m))}
              />
            </div>
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
                  variant="white-danger"
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
