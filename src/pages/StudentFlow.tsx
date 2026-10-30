import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError, apiErrorMessage } from "../api/client";
import {
  askQuestion,
  confirmSubmission,
  getConversations,
  getStudentLearningEvents,
  getStudentQuestion,
  getStudentState,
  getStudentWorkspace,
  getSubmission,
  getSubmissionPreview,
  joinEvaluation,
  leaveEvaluation,
  saveStudentAnswer,
  sendHeartbeat,
  verifyPin,
} from "../api/evaluations";
import type {
  AnswerSource,
  ApiQuestion,
  Review,
  StudentScreen,
  Turn,
  Workspace,
} from "../api/types";
import { useAuth } from "../auth/useAuth";
import {
  emptySession,
  readSession,
  saveSession,
  clearSession,
  getParticipantToken,
  saveParticipantCredentials,
  type StudentSession,
} from "../data/studentSession";
import type { Message, Student } from "../data/grading";
import { PinJoinForm } from "../components/student/PinJoinForm";
import { NicknameForm } from "../components/student/NicknameForm";
import { WaitingRoom } from "../components/student/WaitingRoom";
import { StudentHeader } from "../components/student/StudentHeader";
import { StudentWorkspace } from "../components/student/StudentWorkspace";
import { AnswerEditor } from "../components/student/AnswerEditor";
import { StudentChatPanel } from "../components/student/StudentChatPanel";
import {
  StudentDialogs,
  type StudentDialog,
} from "../components/student/StudentDialogs";
import { Skeleton, SkeletonStatus } from "../components/ui/Skeleton";
import "../components/student/student.css";

function screenFor(lobby: {
  screen?: StudentScreen;
  state: string;
}): StudentScreen {
  if (lobby.screen) return lobby.screen;
  if (lobby.state === "WAITING") return "WAITING";
  if (lobby.state === "STARTED") return "SOLVING";
  return "ENDED";
}

function toChatMessages(turns: Turn[]): Message[] {
  return [...turns]
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    )
    .flatMap((turn) => [
      {
        id: `${turn.requestId}-question`,
        role: "user" as const,
        content: turn.questionText,
      },
      {
        id: `${turn.requestId}-answer`,
        role: "ai" as const,
        content:
          turn.answerText ??
          (turn.state === "PENDING"
            ? "응답을 생성하고 있습니다…"
            : `응답을 완료하지 못했습니다. (${turn.errorCode ?? "AI_PROVIDER_ERROR"})`),
        pending: turn.state === "PENDING" && !turn.answerText,
      },
    ]);
}

function upsertTurn(current: Turn[], next: Turn) {
  const found = current.some((turn) => turn.requestId === next.requestId);
  return found
    ? current.map((turn) => (turn.requestId === next.requestId ? next : turn))
    : [...current, next];
}

const pause = (duration: number) =>
  new Promise((resolve) => window.setTimeout(resolve, duration));

export function StudentFlow({ route }: { route: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [session, setSession] = useState<StudentSession>(() => readSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [questionId, setQuestionId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<Record<string, number>>({});
  const [dirtyAnswers, setDirtyAnswers] = useState<Record<string, boolean>>({});
  const [sourceByQuestion, setSourceByQuestion] = useState<
    Record<string, AnswerSource>
  >({});
  const [aiRequestByQuestion, setAiRequestByQuestion] = useState<
    Record<string, string>
  >({});
  const [turns, setTurns] = useState<Turn[]>([]);
  const [dialog, setDialog] = useState<StudentDialog>("");
  const [notice, setNotice] = useState("");
  const [editorNotice, setEditorNotice] = useState("");
  const [chatNotice, setChatNotice] = useState("");
  const [preview, setPreview] = useState<Review | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [loadingQuestionData, setLoadingQuestionData] = useState(true);
  const [savingQuestionId, setSavingQuestionId] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  const isSolving = route === "/student/solve";
  const isWaiting = route === "/student/wait";
  const readOnly = workspace?.readOnly ?? false;

  function updateSession(next: StudentSession) {
    setSession(next);
    saveSession(next);
  }

  const redirectForParticipantAuthError = useCallback(
    (error: unknown) => {
      if (
        !(error instanceof ApiError) ||
        (error.status !== 401 && !error.code.startsWith("PARTICIPANT_TOKEN"))
      )
        return false;
      clearSession();
      setSession(emptySession);
      setNotice(
        "참가 인증 정보가 만료되었습니다. 같은 주소에서 PIN과 닉네임으로 다시 참가해주세요.",
      );
      navigate("/student/join", { replace: true });
      return true;
    },
    [navigate],
  );

  useEffect(() => {
    if (
      (isWaiting || isSolving) &&
      (!session.evaluationId || !getParticipantToken(session.evaluationId))
    ) {
      if (session.evaluationId) {
        setNotice(
          "참가 인증 정보가 없거나 만료되었습니다. 같은 주소에서 PIN과 닉네임으로 다시 참가해주세요.",
        );
      }
      clearSession();
      setSession(emptySession);
      navigate("/student/join", { replace: true });
    }
  }, [isWaiting, isSolving, session.evaluationId, navigate]);

  useEffect(() => {
    if (!isWaiting && !isSolving) return;
    if (!session.evaluationId) return;
    let active = true;
    const syncState = async () => {
      try {
        const next = await getStudentState(session.evaluationId);
        if (!active) return;
        const screen = screenFor(next);
        if (screen === "WAITING" && isSolving)
          navigate("/student/wait", { replace: true });
        if (screen !== "WAITING" && isWaiting)
          navigate("/student/solve", { replace: true });
      } catch (error) {
        if (active && !redirectForParticipantAuthError(error))
          setNotice(apiErrorMessage(error, "평가 상태를 불러오지 못했습니다."));
      }
    };
    void syncState();
    const stateTimer = window.setInterval(() => void syncState(), 4000);
    const heartbeatTimer = window.setInterval(() => {
      void sendHeartbeat(session.evaluationId).catch((error) => {
        if (active && !redirectForParticipantAuthError(error))
          setNotice(apiErrorMessage(error, "연결 상태를 갱신하지 못했습니다."));
      });
    }, 10000);
    return () => {
      active = false;
      window.clearInterval(stateTimer);
      window.clearInterval(heartbeatTimer);
    };
  }, [
    isWaiting,
    isSolving,
    session.evaluationId,
    navigate,
    redirectForParticipantAuthError,
  ]);

  useEffect(() => {
    if (!isSolving || !session.evaluationId) return;
    let active = true;
    void (async () => {
      setLoadingWorkspace(true);
      setNotice("");
      try {
        const loaded = await getStudentWorkspace(session.evaluationId);
        if (!active) return;
        if (
          !loaded.readOnly &&
          sessionStorage.getItem(
            `lit:policy-accepted:${session.evaluationId}`,
          ) !== "true"
        ) {
          setDialog("policy");
        }
        const ordered = [...loaded.questions].sort(
          (left, right) => left.question.position - right.question.position,
        );
        setWorkspace(loaded);
        setQuestions(ordered.map((row) => row.question));
        setAnswers(
          Object.fromEntries(
            ordered.map(({ question, answer }) => [
              question.id,
              answer.content,
            ]),
          ),
        );
        setVersions(
          Object.fromEntries(
            ordered.map(({ question, answer }) => [
              question.id,
              answer.version,
            ]),
          ),
        );
        setDirtyAnswers({});
        setQuestionId((current) =>
          current && ordered.some((row) => row.question.id === current)
            ? current
            : (ordered[0]?.question.id ?? ""),
        );

        try {
          const events = await getStudentLearningEvents(
            session.evaluationId,
            0,
            200,
          );
          if (!active) return;
          const sources: Record<string, AnswerSource> = {};
          const references: Record<string, string> = {};
          for (const event of events) {
            if (event.type !== "ANSWER_SAVED" || !event.questionId) continue;
            const source = event.details.source;
            const requestId = event.details.aiRequestId;
            if (
              source === "DIRECT" ||
              source === "AI_REFERENCED" ||
              source === "AI_USED"
            )
              sources[event.questionId] = source;
            if (typeof requestId === "string")
              references[event.questionId] = requestId;
          }
          setSourceByQuestion(sources);
          setAiRequestByQuestion(references);
        } catch {
          // Answer editing still works if the optional history read is unavailable.
        }
        if (loaded.status === "SUBMITTED") {
          try {
            await getSubmission(session.evaluationId);
          } catch {
            // Workspace status is sufficient to keep the editor read-only.
          }
        }
      } catch (error) {
        if (active && !redirectForParticipantAuthError(error))
          setNotice(apiErrorMessage(error, "문항을 불러오지 못했습니다."));
      } finally {
        if (active) setLoadingWorkspace(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isSolving, session.evaluationId, redirectForParticipantAuthError]);

  useEffect(() => {
    if (!isSolving || !session.evaluationId || !questionId) {
      setLoadingQuestionData(false);
      return;
    }
    let active = true;
    setLoadingQuestionData(true);
    void Promise.all([
      getStudentQuestion(session.evaluationId, questionId),
      getConversations(session.evaluationId, {
        questionId,
        afterId: 0,
        limit: 200,
      }),
    ])
      .then(([questionAnswer, history]) => {
        if (!active) return;
        setWorkspace((current) =>
          current
            ? {
                ...current,
                questions: current.questions.map((row) =>
                  row.question.id === questionId ? questionAnswer : row,
                ),
              }
            : current,
        );
        setAnswers((current) =>
          current[questionId] !== undefined
            ? current
            : { ...current, [questionId]: questionAnswer.answer.content },
        );
        setVersions((current) => ({
          ...current,
          [questionId]: questionAnswer.answer.version,
        }));
        setTurns(history);
      })
      .catch((error) => {
        if (active)
          setChatNotice(
            apiErrorMessage(error, "문항 기록을 불러오지 못했습니다."),
          );
      })
      .finally(() => {
        if (active) setLoadingQuestionData(false);
      });
    return () => {
      active = false;
    };
  }, [isSolving, session.evaluationId, questionId]);

  useEffect(() => {
    if (!isSolving) return;
    const showWarning = () => setDialog("warning");
    const detectVisibilityChange = () => {
      if (document.visibilityState === "hidden") showWarning();
    };
    const interceptShortcuts = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const printShortcut = (event.ctrlKey || event.metaKey) && key === "p";
      const screenshotShortcut =
        key === "printscreen" ||
        (event.metaKey && event.shiftKey && ["3", "4", "5"].includes(key));
      if (printShortcut) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setNotice("수행평가 화면의 인쇄는 제한되어 있습니다.");
        setDialog("notice");
      } else if (screenshotShortcut) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showWarning();
      }
    };
    document.addEventListener("visibilitychange", detectVisibilityChange);
    window.addEventListener("blur", showWarning);
    window.addEventListener("keydown", interceptShortcuts, true);
    return () => {
      document.removeEventListener("visibilitychange", detectVisibilityChange);
      window.removeEventListener("blur", showWarning);
      window.removeEventListener("keydown", interceptShortcuts, true);
    };
  }, [isSolving]);

  async function saveAnswer(id: string): Promise<boolean> {
    if (!workspace || readOnly || !dirtyAnswers[id]) return true;
    const currentAnswer = workspace.questions.find(
      (row) => row.question.id === id,
    )?.answer;
    const source = sourceByQuestion[id] ?? "DIRECT";
    const aiRequestId = aiRequestByQuestion[id] ?? "";
    if (source !== "DIRECT" && !aiRequestId) {
      setEditorNotice(
        "AI를 참고하거나 사용한 경우 완료된 AI 대화를 선택해주세요.",
      );
      return false;
    }
    setSavingQuestionId(id);
    setEditorNotice("");
    try {
      const saved = await saveStudentAnswer(session.evaluationId, id, {
        content: answers[id] ?? currentAnswer?.content ?? "",
        expectedVersion: versions[id] ?? currentAnswer?.version ?? 0,
        source,
        aiRequestId: source === "DIRECT" ? null : aiRequestId,
      });
      setVersions((current) => ({ ...current, [id]: saved.version }));
      setWorkspace((current) =>
        current
          ? {
              ...current,
              questions: current.questions.map((row) =>
                row.question.id === id ? { ...row, answer: saved } : row,
              ),
            }
          : current,
      );
      setDirtyAnswers((current) => ({ ...current, [id]: false }));
      return true;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "ANSWER_VERSION_CONFLICT"
      ) {
        try {
          const latest = await getStudentQuestion(session.evaluationId, id);
          setVersions((current) => ({
            ...current,
            [id]: latest.answer.version,
          }));
          setWorkspace((current) =>
            current
              ? {
                  ...current,
                  questions: current.questions.map((row) =>
                    row.question.id === id ? latest : row,
                  ),
                }
              : current,
          );
          setEditorNotice(
            "서버의 답안이 바뀌었습니다. 현재 입력을 확인한 뒤 다시 저장해주세요.",
          );
        } catch {
          setEditorNotice(apiErrorMessage(error));
        }
      } else {
        setEditorNotice(apiErrorMessage(error, "답안을 저장하지 못했습니다."));
      }
      return false;
    } finally {
      setSavingQuestionId("");
    }
  }

  async function selectQuestion(nextId: string) {
    if (nextId === questionId) return;
    if (questionId && !(await saveAnswer(questionId))) return;
    setQuestionId(nextId);
    setLoadingQuestionData(true);
    setTurns([]);
    setChatNotice("");
  }

  async function sendAiQuestion(text: string) {
    if (
      aiBusy ||
      !session.evaluationId ||
      !questionId ||
      !workspace ||
      workspace.aiPolicy === "DISABLED" ||
      readOnly
    )
      return;
    const requestId = crypto.randomUUID();
    const pending: Turn = {
      id: Date.now(),
      requestId,
      questionId,
      questionText: text,
      answerText: null,
      state: "PENDING",
      errorCode: null,
      provider: "",
      model: "",
      aiPolicy: workspace.aiPolicy,
      answerVersion: versions[questionId] ?? 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    setTurns((current) => upsertTurn(current, pending));
    setChatNotice("");
    setAiBusy(true);
    try {
      let turn = await askQuestion(
        session.evaluationId,
        questionId,
        requestId,
        text,
      );
      setTurns((current) => upsertTurn(current, turn));
      if (turn.state === "PENDING") {
        for (let attempt = 0; attempt < 30; attempt += 1) {
          await pause(1500);
          const history = await getConversations(session.evaluationId, {
            questionId,
            afterId: 0,
            limit: 200,
          });
          const updated = history.find((item) => item.requestId === requestId);
          if (updated) {
            turn = updated;
            setTurns((current) => upsertTurn(current, updated));
            if (updated.state !== "PENDING") break;
          }
        }
      }
      if (turn.state === "PENDING")
        setChatNotice(
          "응답이 아직 처리 중입니다. 대화 기록을 새로 불러와 확인해주세요.",
        );
      else if (turn.state === "FAILED")
        setChatNotice(
          `AI 응답을 완료하지 못했습니다. (${turn.errorCode ?? "AI_PROVIDER_ERROR"})`,
        );
    } catch (error) {
      setTurns((current) =>
        upsertTurn(current, {
          ...pending,
          state: "FAILED",
          errorCode:
            error instanceof ApiError ? error.code : "AI_PROVIDER_ERROR",
          completedAt: new Date().toISOString(),
        }),
      );
      setChatNotice(apiErrorMessage(error, "AI 질문을 전송하지 못했습니다."));
    } finally {
      setAiBusy(false);
    }
  }

  async function openSubmissionPreview() {
    if (!session.evaluationId) return;
    setDialogError("");
    if (questionId && !(await saveAnswer(questionId))) return;
    try {
      setPreview(await getSubmissionPreview(session.evaluationId));
      setDialog("submit");
    } catch (error) {
      setDialogError(
        apiErrorMessage(error, "제출 내용을 확인하지 못했습니다."),
      );
      setNotice(apiErrorMessage(error));
      setDialog("notice");
    }
  }

  async function submitFinalAnswer() {
    if (!session.evaluationId || !preview?.canConfirm) return;
    setSubmitting(true);
    setDialogError("");
    try {
      await confirmSubmission(session.evaluationId, preview.reviewToken);
      setWorkspace((current) =>
        current ? { ...current, status: "SUBMITTED", readOnly: true } : current,
      );
      setDialog("submitted");
      setPreview(null);
    } catch (error) {
      if (error instanceof ApiError && error.code === "REVIEW_CHANGED") {
        try {
          const latest = await getSubmissionPreview(session.evaluationId);
          setPreview(latest);
          setDialogError(
            "답안이나 대화 기록이 바뀌었습니다. 최신 제출 내용을 다시 확인해주세요.",
          );
        } catch (refreshError) {
          setDialogError(
            apiErrorMessage(
              refreshError,
              "제출 미리보기를 새로 불러오지 못했습니다.",
            ),
          );
        }
      } else {
        setDialogError(apiErrorMessage(error, "답안을 제출하지 못했습니다."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function leave() {
    setDialog("");
    try {
      if (session.evaluationId) await leaveEvaluation(session.evaluationId);
      clearSession();
      setSession(emptySession);
      navigate("/student/join", { replace: true });
    } catch (error) {
      setNotice(apiErrorMessage(error, "평가에서 나가지 못했습니다."));
      setDialog("notice");
    }
  }

  function closeDialog() {
    if (dialog === "policy" && session.evaluationId) {
      sessionStorage.setItem(
        `lit:policy-accepted:${session.evaluationId}`,
        "true",
      );
    }
    setDialog("");
  }

  if (route === "/student/wait") {
    return (
      <WaitingRoom
        nickname={session.nickname || user?.name || "학생"}
        onLeave={() => setDialog("leave")}
        notice={notice}
      />
    );
  }

  if (!isSolving) {
    const queryPin = new URLSearchParams(location.search).get("pin") ?? "";
    return (
      <main className="student-join">
        {route === "/student/nickname" ? (
          <NicknameForm
            initialNickname={session.nickname}
            onJoin={async (nickname) => {
              if (!session.pin || !session.evaluationId)
                throw new Error("먼저 평가 PIN을 확인해주세요.");
              const joined = await joinEvaluation({
                pin: session.pin,
                nickname,
              });
              if (!joined.participantToken)
                throw new Error(
                  "참가 토큰을 받지 못했습니다. PIN 입력부터 다시 시도해주세요.",
                );
              const joinedEvaluationId =
                joined.lobby?.evaluationId || session.evaluationId;
              saveParticipantCredentials(
                joined.participantToken,
                joinedEvaluationId,
              );
              if (!getParticipantToken(joinedEvaluationId))
                throw new Error(
                  "이 브라우저 탭에 참가 토큰을 저장하지 못했습니다. PIN과 닉네임으로 다시 참가해주세요.",
                );
              updateSession({
                ...session,
                evaluationId: joinedEvaluationId,
                nickname,
                participantId: joined.participantId,
              });
              navigate("/student/wait", { replace: true });
            }}
          />
        ) : (
          <PinJoinForm
            initialPin={queryPin || session.pin}
            onJoin={async (pin) => {
              const evaluation = await verifyPin(pin);
              clearSession();
              updateSession({
                ...emptySession,
                pin,
                evaluationId: evaluation.id,
                evaluationTitle: evaluation.title,
              });
              navigate("/student/nickname", { replace: true });
            }}
          />
        )}
        {notice && (
          <p className="student-flow-notice" role="status">
            {notice}
          </p>
        )}
        <StudentDialogs
          kind={dialog}
          notice={notice}
          preview={preview}
          aiPolicy={workspace?.aiPolicy ?? null}
          submitting={submitting}
          error={dialogError}
          onClose={closeDialog}
          onLeave={() => void leave()}
          onSubmit={() => void submitFinalAnswer()}
        />
      </main>
    );
  }

  if (loadingWorkspace && !workspace)
    return (
      <SkeletonStatus
        className="student-solving compact-workspace student-workspace-skeleton"
        label="평가 문항을 불러오고 있습니다."
      >
        <header
          className="header student-header student-workspace-skeleton-header"
          aria-hidden="true"
        >
          <Skeleton className="student-workspace-skeleton-logo" />
          <nav>
            <Skeleton className="student-workspace-skeleton-icon-button" />
            <Skeleton className="student-workspace-skeleton-icon-button" />
            <Skeleton className="student-workspace-skeleton-header-button" />
            <Skeleton className="student-workspace-skeleton-header-button" />
          </nav>
        </header>
        <div
          className="student-solving-body student-workspace-skeleton-body"
          aria-hidden="true"
        >
          <main className="student-writing">
            <section className="student-editor student-workspace-skeleton-card">
              <Skeleton className="student-workspace-skeleton-title" />
              <div className="question-tabs student-workspace-skeleton-tabs">
                <Skeleton />
                <span />
              </div>
              <section className="question-box student-workspace-skeleton-question">
                <Skeleton className="student-workspace-skeleton-question-title" />
                <Skeleton className="student-workspace-skeleton-question-line" />
                <Skeleton className="student-workspace-skeleton-question-line is-short" />
              </section>
              <div className="answer-rich-editor student-workspace-skeleton-rich-editor">
                <div className="answer-toolbar-scroll">
                  <div className="student-workspace-skeleton-toolbar">
                    <Skeleton />
                    <Skeleton />
                    <Skeleton />
                    <i />
                    <Skeleton />
                    <Skeleton />
                    <Skeleton />
                    <i />
                    <Skeleton />
                    <Skeleton />
                    <Skeleton />
                  </div>
                </div>
                <div className="student-answer-content student-workspace-skeleton-answer">
                  <Skeleton />
                  <Skeleton />
                  <Skeleton />
                </div>
                <div className="answer-rich-status">
                  <Skeleton />
                  <Skeleton />
                </div>
              </div>
              <div className="student-workspace-skeleton-source">
                <Skeleton />
                <Skeleton />
              </div>
            </section>
          </main>
          <div className="student-sidebar-divider student-workspace-skeleton-divider" />
          <div className="workspace-sidebar">
            <aside className="student-chat student-workspace-skeleton-chat">
              <h2>
                <Skeleton />
              </h2>
              <div className="student-chat-history student-workspace-skeleton-chat-history">
                <div className="student-workspace-skeleton-chat-message">
                  <div>
                    <Skeleton />
                    <Skeleton />
                  </div>
                  <Skeleton />
                  <Skeleton />
                </div>
                <div className="student-workspace-skeleton-chat-message is-user">
                  <div>
                    <Skeleton />
                    <Skeleton />
                  </div>
                  <Skeleton />
                </div>
              </div>
              <div className="student-chat-composer student-workspace-skeleton-composer">
                <div>
                  <Skeleton />
                  <Skeleton />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </SkeletonStatus>
    );
  if (!workspace)
    return (
      <main className="student-workspace-loading" role="alert">
        {notice || "평가 정보를 불러오지 못했습니다."}
        <button type="button" onClick={() => navigate("/student/join")}>
          PIN 입력으로 돌아가기
        </button>
      </main>
    );

  const messages = toChatMessages(turns);
  const displayStudent: Student = {
    id: workspace.participantId,
    name: session.nickname || user?.name || "학생",
    color: "#ffd4d3",
    status: workspace.status === "SUBMITTED" ? "제출완료" : "작성중",
    submittedAt: null,
    answers: [],
    messages,
    activities: [],
    rubric: [],
  };
  const selectedQuestion = questions.find(
    (question) => question.id === questionId,
  );

  return (
    <div
      className="student-solving compact-workspace"
      onCopy={(event) => event.preventDefault()}
    >
      <StudentHeader
        submitted={workspace.status === "SUBMITTED"}
        disabledSubmit={readOnly}
        onLeave={() => setDialog("leave")}
        onSubmit={() => void openSubmissionPreview()}
        onPolicy={() => setDialog("policy")}
        onNotice={(title) => {
          setNotice(title);
          setDialog("notice");
        }}
      />
      <StudentWorkspace
        sidebarExpanded={chatExpanded}
        editor={
          <main className="student-writing">
            <AnswerEditor
              questions={questions}
              questionId={questionId}
              answers={answers}
              readOnly={readOnly}
              sourceByQuestion={sourceByQuestion}
              aiRequestByQuestion={aiRequestByQuestion}
              completedTurns={turns}
              savingQuestionId={savingQuestionId}
              notice={editorNotice}
              onQuestion={(id) => void selectQuestion(id)}
              onAnswer={(id, text) => {
                setAnswers((current) => ({ ...current, [id]: text }));
                setDirtyAnswers((current) => ({ ...current, [id]: true }));
                setEditorNotice("");
              }}
              onSave={(id) => void saveAnswer(id)}
              onSourceChange={(id, source) => {
                setSourceByQuestion((current) => ({
                  ...current,
                  [id]: source,
                }));
                setDirtyAnswers((current) => ({ ...current, [id]: true }));
              }}
              onAiRequestChange={(id, requestId) => {
                setAiRequestByQuestion((current) => ({
                  ...current,
                  [id]: requestId,
                }));
                setDirtyAnswers((current) => ({ ...current, [id]: true }));
              }}
            />
          </main>
        }
        chat={
          <StudentChatPanel
            expanded={chatExpanded}
            onExpandedChange={setChatExpanded}
            student={displayStudent}
            messages={messages}
            loadingHistory={loadingQuestionData}
            aiPolicy={workspace.aiPolicy}
            disabled={readOnly || workspace.aiPolicy === "DISABLED"}
            busy={aiBusy}
            notice={
              readOnly
                ? "제출 또는 평가 종료 후에는 AI 질문을 할 수 없습니다."
                : workspace.aiPolicy === "DISABLED"
                  ? "이 평가에서는 AI 사용이 허용되지 않았습니다."
                  : chatNotice
            }
            onSend={(text) => void sendAiQuestion(text)}
          />
        }
      />
      {notice && (
        <p className="student-runtime-notice" role="status">
          {notice}
        </p>
      )}
      <StudentDialogs
        kind={dialog}
        notice={notice}
        preview={preview}
        aiPolicy={workspace.aiPolicy}
        submitting={submitting}
        error={dialogError}
        onClose={closeDialog}
        onLeave={() => void leave()}
        onSubmit={() => void submitFinalAnswer()}
      />
      {selectedQuestion && (
        <span className="sr-only" aria-live="polite">
          현재 {selectedQuestion.title}입니다.
        </span>
      )}
      <div className="student-print-protection">
        수행평가 화면은 인쇄할 수 없습니다.
      </div>
    </div>
  );
}
