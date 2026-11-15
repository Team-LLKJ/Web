import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type UIEvent,
} from "react";
import { htmlToPlainText } from "../lib/guidelinesText";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError, apiErrorMessage } from "../api/client";
import {
  askQuestion,
  confirmSubmission,
  getConversations,
  getStudentLearningEvents,
  getStudentAnswer,
  getStudentQuestion,
  getStudentState,
  getStudentWorkspace,
  getSubmission,
  getSubmissionPreview,
  joinEvaluation,
  leaveEvaluation,
  reconnectParticipant,
  saveStudentAnswer,
  sendClientEvent,
  sendHeartbeat,
  verifyPin,
} from "../api/evaluations";
import type {
  AnswerSource,
  ApiQuestion,
  Review,
  Turn,
  Workspace,
} from "../api/types";
import { useAuth } from "../auth/useAuth";
import {
  clearAnswerDrafts,
  emptySession,
  readAnswerDraft,
  readLastQuestion,
  readSession,
  removeAnswerDraft,
  saveAnswerDraft,
  saveLastQuestion,
  saveSession,
  clearSession,
  getParticipantToken,
  getReconnectCredentials,
  saveSubmittedInfo,
  saveParticipantCredentials,
  type StudentSession,
} from "../data/studentSession";
import type { Message, Student } from "../data/grading";
import { Toast } from "../components/teacher/Toast";
import { PinJoinForm } from "../components/student/PinJoinForm";
import { NicknameForm } from "../components/student/NicknameForm";
import { WaitingRoom } from "../components/student/WaitingRoom";
import { StudentHeader } from "../components/student/StudentHeader";
import { StudentWorkspace } from "../components/student/StudentWorkspace";
import { readChatWidth } from "../components/student/chatWidth";
import { AnswerEditor } from "../components/student/AnswerEditor";
import { StudentChatPanel } from "../components/student/StudentChatPanel";
import {
  StudentDialogs,
  type StudentDialog,
} from "../components/student/StudentDialogs";
import {
  AnswerConflictDialog,
  type AnswerConflict,
} from "../components/student/AnswerConflictDialog";
import { ConnectionBanner } from "../components/student/ConnectionBanner";
import {
  isEndedError,
  isNetworkError,
  screenFor,
  type ConnectionState,
} from "../lib/studentConnection";
import { Skeleton, SkeletonStatus } from "../components/ui/Skeleton";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { Tabs } from "../components/ui/Tabs";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { addedMinutes, toEndInfo, type EndInfo } from "../lib/remainingTime";
import "../components/student/student.css";

// 서버 오류 코드를 학생이 이해할 수 있는 안내 문구로 바꿉니다.
const AI_FAILURE_MESSAGES: Record<string, string> = {
  AI_TIMEOUT: "AI 응답이 너무 오래 걸려 중단됐어요. 잠시 후 다시 질문해 주세요.",
  AI_NOT_CONFIGURED: "AI 기능이 아직 준비되지 않았어요. 선생님께 알려 주세요.",
  AI_PROVIDER_RATE_LIMITED: "지금 AI 요청이 많아요. 잠시 후 다시 질문해 주세요.",
  AI_PROVIDER_UNAVAILABLE: "AI 서비스가 일시적으로 불안정해요. 잠시 후 다시 질문해 주세요.",
  AI_MODEL_UNAVAILABLE: "AI 모델을 사용할 수 없어요. 선생님께 알려 주세요.",
  AI_AUTHENTICATION_FAILED: "AI 연결 설정에 문제가 있어요. 선생님께 알려 주세요.",
  EVALUATION_CLOSED: "평가가 종료되어 AI 응답을 받지 못했어요.",
};
function aiFailureMessage(code: string | null | undefined) {
  if (code && AI_FAILURE_MESSAGES[code]) return AI_FAILURE_MESSAGES[code];
  if (code === "HTTP_502" || code === "HTTP_503" || code === "HTTP_504")
    return "AI 서버와 연결하지 못했어요. 잠시 후 다시 질문해 주세요.";
  return "AI 응답을 완료하지 못했어요. 잠시 후 다시 질문해 주세요.";
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
            : aiFailureMessage(turn.errorCode)),
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

const AUTOSAVE_DELAY_MS = 3000;
const RESTORED_BANNER_MS = 2500;
const pause = (duration: number) =>
  new Promise((resolve) => window.setTimeout(resolve, duration));

// AI 정책 확인은 학생(참가자)마다 따로 기록합니다. 반 단위로 기록하면 같은 기기의 다음 학생이 정책을 못 봅니다.
// (서버에 확인 기록 API가 생기면 그쪽으로 옮깁니다.)
const policyAcceptedKey = (session: StudentSession) =>
  `lit:policy-accepted:${session.evaluationId}:${session.participantId || session.nickname}`;

export function StudentFlow({ route }: { route: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [session, setSession] = useState<StudentSession>(() => readSession());
  const policyKey = policyAcceptedKey(session);
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
  // Chat history already loaded per question, so revisiting a tab shows it instantly.
  const [dialog, setDialog] = useState<StudentDialog>("");
  const [notice, setNotice] = useState("");
  // 선생님이 평가 시간을 늘렸을 때 학생에게 알리는 토스트입니다.
  const [timeToast, setTimeToast] = useState("");
  const lastEndsAt = useRef<number | null>(null);
  const [endInfo, setEndInfo] = useState<EndInfo | null>(null);
  const [editorNotice, setEditorNotice] = useState("");
  const [chatNotice, setChatNotice] = useState("");
  const [preview, setPreview] = useState<Review | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [savingQuestionId, setSavingQuestionId] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  // 폰·태블릿에서는 작성 화면과 AI 대화창을 옆으로 넘겨 봅니다(위쪽 탭으로도 전환).
  const phone = useMediaQuery("(max-width: 1100px)");
  const [pane, setPane] = useState<"answer" | "chat">("answer");
  const solvingRef = useRef<HTMLDivElement>(null);
  function showPane(next: "answer" | "chat") {
    setPane(next);
    const body = solvingRef.current?.querySelector<HTMLElement>(
      ".student-solving-body",
    );
    body?.scrollTo({
      left: next === "chat" ? body.clientWidth : 0,
      behavior: "smooth",
    });
  }
  function followPane(event: UIEvent<HTMLDivElement>) {
    const body = event.target as HTMLElement;
    if (!body.classList.contains("student-solving-body")) return;
    const next = body.scrollLeft > body.clientWidth / 2 ? "chat" : "answer";
    setPane((current) => (current === next ? current : next));
  }
  const [connection, setConnection] = useState<ConnectionState>("online");
  const connectionLost = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [conflicts, setConflicts] = useState<AnswerConflict[]>([]);
  const [draftFailed, setDraftFailed] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [startOnQuestion, setStartOnQuestion] = useState(false);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  });

  const isSolving = route === "/student/solve";
  const isWaiting = route === "/student/wait";
  // 제한시간이 끝나면 서버 응답을 기다리지 않고 바로 수정을 막는다.
  const [timeUp, setTimeUp] = useState(false);
  const serverReadOnly = workspace?.readOnly ?? false;
  const readOnly = serverReadOnly || timeUp;
  const forceEndRef = useRef<() => Promise<void>>(async () => undefined);
  // 제출을 마쳐 참가 정보를 지운 뒤에는 '참가 정보 없음' 감시가 입장 화면으로 보내지 않게 합니다.
  const submittedRef = useRef(false);
  const endHandled = useRef(false);
  const questionIdRef = useRef("");
  const lastEventAt = useRef(0);

  function updateSession(next: StudentSession) {
    setSession(next);
    saveSession(next);
  }

  const markConnectionLost = useCallback(() => {
    connectionLost.current = true;
    setConnection("offline");
  }, []);
  const markConnectionAlive = useCallback(() => {
    if (!connectionLost.current) return;
    connectionLost.current = false;
    setConnection("restored");
  }, []);

  const redirectForParticipantAuthError = useCallback(
    (error: unknown) => {
      // 제출 뒤 평가에서 나가 토큰이 막힌 요청은 완료 화면으로 가는 중이므로 무시합니다.
      if (submittedRef.current) return true;
      const expelled = error instanceof ApiError && error.code === "PARTICIPANT_EXPELLED";
      if (
        !(error instanceof ApiError) ||
        (error.status !== 401 && !error.code.startsWith("PARTICIPANT_TOKEN") && !expelled)
      )
        return false;
      clearSession();
      setSession(emptySession);
      const message = expelled
        ? "선생님이 이 평가의 참여를 종료했어요. 다시 참여하려면 선생님께 말씀해주세요."
        : "참가 인증 정보가 만료되었습니다. 같은 주소에서 PIN과 닉네임으로 다시 참가해주세요.";
      setNotice(message);
      // 화면이 바뀌면서 안내가 사라지지 않게 이동할 때 함께 넘깁니다.
      navigate("/student/join", { replace: true, state: { notice: message } });
      return true;
    },
    [navigate],
  );

  // 재접속: 대기·풀이 화면에 들어오면 기존 토큰으로 참가 상태를 다시 살리고,
  // 참여 화면에서는 탭을 닫기 전 평가가 아직 진행 중이면 PIN 없이 이어서 들어갑니다.
  const reconnectTried = useRef("");
  const isJoinPage = !isWaiting && !isSolving && route !== "/student/nickname";
  useEffect(() => {
    if (!isWaiting && !isSolving && !isJoinPage) return;
    const saved = getReconnectCredentials();
    const evaluationId = isJoinPage ? (saved?.evaluationId ?? "") : session.evaluationId;
    const token = evaluationId ? getParticipantToken(evaluationId) : null;
    if (!evaluationId || !token || reconnectTried.current === evaluationId) return;
    // 참여 화면에서 주소의 PIN으로 다른 평가에 들어오려는 경우엔 이어 들어가지 않습니다.
    const pinInUrl = new URLSearchParams(location.search).get("pin") ?? "";
    if (isJoinPage && pinInUrl && session.pin && pinInUrl !== session.pin) return;
    reconnectTried.current = evaluationId;
    let active = true;
    reconnectParticipant(evaluationId, token)
      .then((result) => {
        if (!active) return;
        saveParticipantCredentials(token, result.evaluationId);
        const current = readSession();
        updateSession({
          ...current,
          evaluationId: result.evaluationId,
          evaluationTitle: result.lobby.title || current.evaluationTitle,
          nickname: result.nickname,
          participantId: result.participantId,
        });
        const screen = screenFor(result.lobby);
        if (screen === "WAITING" && !isWaiting) navigate("/student/wait", { replace: true });
        else if (screen === "SOLVING" && !isSolving) navigate("/student/solve", { replace: true });
      })
      .catch((error) => {
        if (!active) return;
        if (isJoinPage) {
          // 이어 들어갈 수 없는 평가면 남은 재접속 정보만 지우고 PIN 입력을 그대로 보여 줍니다.
          if (error instanceof ApiError && error.status === 401) clearSession();
          return;
        }
        // 재접속 API가 없는 서버여도 기존 토큰으로 계속 진행합니다.
        redirectForParticipantAuthError(error);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWaiting, isSolving, isJoinPage, session.evaluationId]);

  useEffect(() => {
    if (submittedRef.current) return;
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
      // 만료·종료 안내가 이미 정해졌다면 이동하면서 잃지 않게 함께 넘깁니다.
      navigate("/student/join", { replace: true, state: notice ? { notice } : undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWaiting, isSolving, session.evaluationId, navigate]);

  useEffect(() => {
    if (!isWaiting && !isSolving) return;
    if (!session.evaluationId) return;
    let active = true;
    const syncState = async () => {
      try {
        const next = await getStudentState(session.evaluationId);
        if (!active) return;
        markConnectionAlive();
        const screen = screenFor(next);
        if (next.endsAt) {
          const endsAt = new Date(next.endsAt).getTime();
          const added = addedMinutes(lastEndsAt.current, endsAt);
          if (added > 0) setTimeToast(`선생님이 평가 시간을 ${added}분 늘렸어요.`);
          lastEndsAt.current = endsAt;
          setEndInfo(toEndInfo(next.endsAt, next.serverNow));
        }
        if (screen === "ENDED" && isSolving && !endHandled.current) {
          endHandled.current = true;
          void forceEndRef.current();
          return;
        }
        if (screen === "WAITING" && isSolving)
          navigate("/student/wait", { replace: true });
        if (screen !== "WAITING" && isWaiting)
          navigate("/student/solve", { replace: true });
      } catch (error) {
        if (active && isEndedError(error) && isSolving) {
          if (!endHandled.current) {
            endHandled.current = true;
            void forceEndRef.current();
          }
        } else if (active && isNetworkError(error)) {
          markConnectionLost();
        } else if (active && !redirectForParticipantAuthError(error))
          setNotice(apiErrorMessage(error, "평가 상태를 불러오지 못했습니다."));
      }
    };
    const handleOnline = () => {
      if (connectionLost.current) setConnection("reconnecting");
      void syncState();
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", markConnectionLost);
    void syncState();
    const stateTimer = window.setInterval(() => void syncState(), 4000);
    const heartbeatTimer = window.setInterval(() => {
      void sendHeartbeat(session.evaluationId).catch((error) => {
        if (active && isEndedError(error) && isSolving) {
          if (!endHandled.current) {
            endHandled.current = true;
            void forceEndRef.current();
          }
        } else if (active && isNetworkError(error)) {
          markConnectionLost();
        } else if (active && !redirectForParticipantAuthError(error))
          setNotice(apiErrorMessage(error, "연결 상태를 갱신하지 못했습니다."));
      });
    }, 10000);
    return () => {
      active = false;
      window.clearInterval(stateTimer);
      window.clearInterval(heartbeatTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", markConnectionLost);
    };
  }, [
    isWaiting,
    isSolving,
    session.evaluationId,
    navigate,
    redirectForParticipantAuthError,
    markConnectionAlive,
    markConnectionLost,
  ]);

  // 다시 연결되면 안내를 잠시 보여주고, 못 불러온 평가 정보가 있으면 다시 불러옵니다. 답안 저장은 자동 저장이 이어받습니다.
  const workspaceMissing = !workspace;
  useEffect(() => {
    if (connection !== "restored") return;
    if (workspaceMissing) setReloadKey((current) => current + 1);
    const timer = window.setTimeout(
      () => setConnection("online"),
      RESTORED_BANNER_MS,
    );
    return () => window.clearTimeout(timer);
  }, [connection, workspaceMissing]);

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
          sessionStorage.getItem(policyKey) !== "true"
        ) {
          setDialog("policy");
        }
        const ordered = [...loaded.questions].sort(
          (left, right) => left.question.position - right.question.position,
        );
        setWorkspace(loaded);
        setQuestions(ordered.map((row) => row.question));
        // 이 브라우저에 보관한 초안을 서버 답안과 맞춰 봅니다.
        const nextAnswers: Record<string, string> = {};
        const nextDirty: Record<string, boolean> = {};
        const nextConflicts: AnswerConflict[] = [];
        if (loaded.readOnly) clearAnswerDrafts(session.evaluationId);
        for (const { question, answer } of ordered) {
          nextAnswers[question.id] = answer.content;
          const draft = loaded.readOnly
            ? null
            : readAnswerDraft(session.evaluationId, question.id);
          if (!draft) continue;
          if (draft.content === answer.content) {
            removeAnswerDraft(session.evaluationId, question.id);
          } else if (draft.baseVersion === answer.version) {
            nextAnswers[question.id] = draft.content;
            nextDirty[question.id] = true;
          } else {
            nextConflicts.push({
              questionId: question.id,
              title: question.title,
              local: draft.content,
              server: answer.content,
              version: answer.version,
            });
          }
        }
        setAnswers(nextAnswers);
        setConflicts(nextConflicts);
        if (Object.keys(nextDirty).length)
          setTimeToast("이 브라우저에 보관한 작성 내용을 복원했어요.");
        setVersions(
          Object.fromEntries(
            ordered.map(({ question, answer }) => [
              question.id,
              answer.version,
            ]),
          ),
        );
        setDirtyAnswers(nextDirty);
        const lastQuestion = readLastQuestion(session.evaluationId);
        const resumable = ordered.some(
          (row) => row.question.id === lastQuestion,
        );
        setStartOnQuestion(resumable);
        setQuestionId((current) =>
          current && ordered.some((row) => row.question.id === current)
            ? current
            : resumable && lastQuestion
              ? lastQuestion
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
        if (active && isNetworkError(error)) markConnectionLost();
        else if (active && !redirectForParticipantAuthError(error))
          setNotice(apiErrorMessage(error, "문항을 불러오지 못했습니다."));
      } finally {
        if (active) setLoadingWorkspace(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    isSolving,
    session.evaluationId,
    policyKey,
    redirectForParticipantAuthError,
    markConnectionLost,
    reloadKey,
  ]);

  useEffect(() => {
    if (!isSolving || !session.evaluationId || !questionId) return;
    let active = true;
    void getStudentQuestion(session.evaluationId, questionId)
      .then((questionAnswer) => {
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
      })
      .catch((error) => {
        if (active && isNetworkError(error)) markConnectionLost();
        else if (active)
          setChatNotice(
            apiErrorMessage(error, "문항을 불러오지 못했습니다."),
          );
      });
    return () => {
      active = false;
    };
  }, [isSolving, session.evaluationId, questionId, markConnectionLost]);

  // AI 대화창은 모든 문항이 하나를 함께 쓰므로, 문항을 바꿔도 초기화되지 않게 전체 기록을 한 번만 불러온다.
  useEffect(() => {
    if (!isSolving || !session.evaluationId) return;
    let active = true;
    setLoadingHistory(true);
    void (async () => {
      const all: Turn[] = [];
      let afterId = 0;
      for (let page = 0; page < 50; page += 1) {
        const batch = await getConversations(session.evaluationId, {
          afterId,
          limit: 200,
        });
        all.push(...batch);
        if (batch.length < 200) break;
        afterId = Math.max(...batch.map((turn) => turn.id));
      }
      if (active) setTurns(all);
    })()
      .catch((error) => {
        if (active && isNetworkError(error)) markConnectionLost();
        else if (active)
          setChatNotice(
            apiErrorMessage(error, "대화 기록을 불러오지 못했습니다."),
          );
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, [isSolving, session.evaluationId, markConnectionLost, reloadKey]);

  useEffect(() => {
    questionIdRef.current = questionId;
  }, [questionId]);

  useEffect(() => {
    if (!isSolving) return;
    const report = (type: "WINDOW_LEAVE" | "SHORTCUT_CAPTURE") => {
      const now = Date.now();
      if (now - lastEventAt.current < 1500 || !session.evaluationId) return;
      lastEventAt.current = now;
      void sendClientEvent(session.evaluationId, {
        type,
        occurredAt: new Date(now).toISOString(),
        questionId: questionIdRef.current || null,
      }).catch(() => undefined);
    };
    const showWarning = (type: "WINDOW_LEAVE" | "SHORTCUT_CAPTURE" = "WINDOW_LEAVE") => {
      report(type);
      setDialog("warning");
    };
    const detectVisibilityChange = () => {
      if (document.visibilityState === "hidden") showWarning("WINDOW_LEAVE");
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
        showWarning("SHORTCUT_CAPTURE");
      }
    };
    document.addEventListener("visibilitychange", detectVisibilityChange);
    const onBlur = () => showWarning("WINDOW_LEAVE");
    window.addEventListener("blur", onBlur);
    window.addEventListener("keydown", interceptShortcuts, true);
    return () => {
      document.removeEventListener("visibilitychange", detectVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("keydown", interceptShortcuts, true);
    };
  }, [isSolving, session.evaluationId]);

  // 교사가 켠 경우에만 전체 화면 이탈과 개발자 도구 열림을 기록합니다.
  const antiCheatKey = (workspace?.antiCheat ?? []).join(",");
  useEffect(() => {
    if (!isSolving || !session.evaluationId) return;
    const enabled = antiCheatKey.split(",");
    const evaluationId = session.evaluationId;
    const send = (type: "FULLSCREEN_EXIT" | "DEVTOOLS_OPEN") => {
      void sendClientEvent(evaluationId, {
        type,
        occurredAt: new Date().toISOString(),
        questionId: questionIdRef.current || null,
      }).catch(() => undefined);
      setDialog("warning");
    };
    const cleanups: (() => void)[] = [];
    if (enabled.includes("FULLSCREEN_LEAVE")) {
      let wasFullscreen = false;
      // 전체 화면은 사용자 동작이 있어야 켤 수 있어 첫 클릭 때 켭니다.
      const enter = () => {
        if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
      };
      const onChange = () => {
        if (document.fullscreenElement) wasFullscreen = true;
        else if (wasFullscreen) {
          wasFullscreen = false;
          send("FULLSCREEN_EXIT");
        }
      };
      document.addEventListener("pointerdown", enter, { once: true });
      document.addEventListener("fullscreenchange", onChange);
      cleanups.push(() => {
        document.removeEventListener("pointerdown", enter);
        document.removeEventListener("fullscreenchange", onChange);
      });
    }
    if (enabled.includes("DEVTOOLS")) {
      // 창 안팎 크기 차이로 개발자 도구가 붙어 있는지 추정합니다(정확하지 않을 수 있어요).
      let open = false;
      const check = () => {
        const docked =
          window.outerWidth - window.innerWidth > 200 || window.outerHeight - window.innerHeight > 260;
        if (docked && !open) send("DEVTOOLS_OPEN");
        open = docked;
      };
      const timer = window.setInterval(check, 2000);
      cleanups.push(() => window.clearInterval(timer));
    }
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [isSolving, session.evaluationId, antiCheatKey]);

  // Autosave: a few seconds after the last edit, without waiting for focus to leave the editor.
  const saveLatest = useRef<(id: string) => Promise<boolean>>(
    async () => true,
  );
  useEffect(() => {
    saveLatest.current = saveAnswer;
  });
  // 지금 문항을 먼저 저장하고, 끊긴 동안 쌓이거나 복원한 다른 문항도 이어서 저장합니다.
  const dirtyQuestionId =
    questionId && dirtyAnswers[questionId]
      ? questionId
      : (Object.keys(dirtyAnswers).find((id) => dirtyAnswers[id]) ?? "");
  const currentContent = questionId ? answers[questionId] : undefined;
  const hasConflict = conflicts.length > 0;
  const connected = connection === "online" || connection === "restored";
  useEffect(() => {
    if (!isSolving || readOnly || !dirtyQuestionId || !connected) return;
    // After a save error or version conflict, wait for the next edit instead of retrying blindly.
    if (savingQuestionId || editorNotice || hasConflict) return;
    const timer = window.setTimeout(() => {
      void saveLatest.current(dirtyQuestionId);
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [
    isSolving,
    readOnly,
    dirtyQuestionId,
    currentContent,
    savingQuestionId,
    editorNotice,
    hasConflict,
    connected,
  ]);

  async function saveAnswer(id: string): Promise<boolean> {
    if (!workspace || serverReadOnly || !dirtyAnswers[id]) return true;
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
    const content = answers[id] ?? currentAnswer?.content ?? "";
    try {
      const saved = await saveStudentAnswer(session.evaluationId, id, {
        content,
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
      // 저장하는 동안 더 입력했다면 그 내용은 초안에 남기고 다음 자동 저장에 맡깁니다.
      const latestContent = answersRef.current[id] ?? content;
      if (latestContent === content) {
        removeAnswerDraft(session.evaluationId, id);
        setDirtyAnswers((current) => ({ ...current, [id]: false }));
      } else {
        saveAnswerDraft(session.evaluationId, id, {
          content: latestContent,
          baseVersion: saved.version,
        });
      }
      return true;
    } catch (error) {
      if (isNetworkError(error)) {
        markConnectionLost();
      } else if (
        error instanceof ApiError &&
        error.code === "ANSWER_VERSION_CONFLICT"
      ) {
        try {
          const latest = await getStudentAnswer(session.evaluationId, id).catch(
            async () => (await getStudentQuestion(session.evaluationId, id)).answer,
          );
          setVersions((current) => ({
            ...current,
            [id]: latest.version,
          }));
          setWorkspace((current) =>
            current
              ? {
                  ...current,
                  questions: current.questions.map((row) =>
                    row.question.id === id ? { ...row, answer: latest } : row,
                  ),
                }
              : current,
          );
          if (latest.content === content) {
            removeAnswerDraft(session.evaluationId, id);
            setDirtyAnswers((current) => ({ ...current, [id]: false }));
            return true;
          }
          setConflicts((current) => [
            ...current.filter((item) => item.questionId !== id),
            {
              questionId: id,
              title:
                questions.find((question) => question.id === id)?.title ??
                "이 문항",
              local: content,
              server: latest.content,
              version: latest.version,
            },
          ]);
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

  function resolveConflict(useLocal: boolean) {
    const conflict = conflicts[0];
    if (!conflict) return;
    const { questionId: id, version } = conflict;
    const content = useLocal ? conflict.local : conflict.server;
    setAnswers((current) => ({ ...current, [id]: content }));
    setVersions((current) => ({ ...current, [id]: version }));
    setDirtyAnswers((current) => ({ ...current, [id]: useLocal }));
    if (useLocal)
      saveAnswerDraft(session.evaluationId, id, {
        content,
        baseVersion: version,
      });
    else removeAnswerDraft(session.evaluationId, id);
    setEditorRevision((current) => current + 1);
    setConflicts((current) => current.slice(1));
  }

  // 제한시간 종료: 답안 수정을 막고, 마지막 답안을 저장·제출한 뒤 평가에서 내보낸다.
  async function forceEnd() {
    setTimeUp(true);
    setDialog("");
    let submitted = workspace?.status === "SUBMITTED";
    if (session.evaluationId && !serverReadOnly) {
      try {
        // 아직 저장되지 않은 답안은 모든 문항을 저장합니다.
        for (const row of workspace?.questions ?? [])
          await saveAnswer(row.question.id);
        if (!submitted) {
          const review = await getSubmissionPreview(session.evaluationId);
          if (review.canConfirm) {
            await confirmSubmission(session.evaluationId, review.reviewToken);
            submitted = true;
          }
        }
      } catch {
        // 서버가 이미 종료 처리했거나 제출할 수 없는 상태면 그대로 내보낸다.
      }
    }
    // 교사가 종료했든 시간이 끝났든 완료 화면에서 안내합니다(직접 제출한 경우와 같은 흐름).
    submittedRef.current = true;
    saveSubmittedInfo({
      title: session.evaluationTitle,
      nickname: session.nickname,
      ended: true,
      submitted,
    });
    clearSession();
    setSession(emptySession);
    setDialog("");
    navigate("/student/done", { replace: true });
  }
  useEffect(() => {
    forceEndRef.current = forceEnd;
  });
  // 다른 평가에 다시 참가하면 종료 상태를 초기화한다.
  useEffect(() => {
    endHandled.current = false;
    setTimeUp(false);
  }, [session.evaluationId]);

  async function selectQuestion(nextId: string) {
    saveLastQuestion(session.evaluationId, nextId);
    if (nextId === questionId) return;
    // 연결이 끊겼을 때는 초안이 남아 있으니 문항 이동을 막지 않습니다.
    if (
      questionId &&
      !(await saveAnswer(questionId)) &&
      !connectionLost.current
    )
      return;
    setQuestionId(nextId);
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
          aiFailureMessage(turn.errorCode),
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
      setChatNotice(
        error instanceof ApiError &&
          (error.code.startsWith("HTTP_5") || error.code.startsWith("AI_"))
          ? aiFailureMessage(error.code)
          : apiErrorMessage(error, "AI 질문을 전송하지 못했습니다."),
      );
    } finally {
      setAiBusy(false);
    }
  }

  async function openSubmissionPreview() {
    if (!session.evaluationId) return;
    setDialogError("");
    if (!connected) {
      setNotice("연결이 끊겨 제출할 수 없어요. 다시 연결되면 제출해주세요.");
      setDialog("notice");
      return;
    }
    for (const id of questions.map((item) => item.id))
      if (!(await saveAnswer(id))) return;
    for (const [index, item] of questions.entries()) {
      if (!item.minChars) continue;
      const length = htmlToPlainText(answers[item.id] ?? "").replace(/\n/g, "").length;
      if (length < item.minChars) {
        setNotice(
          `${questions.length === 1 ? "문항" : `문항 ${index + 1}`}은 최소 ${item.minChars.toLocaleString()}자 이상 작성해야 제출할 수 있어요. (현재 ${length.toLocaleString()}자)`,
        );
        setDialog("notice");
        return;
      }
    }
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
      setPreview(null);
      // 제출하면 평가에서 자동으로 나가 처음 화면으로 돌아갑니다.
      try {
        await leaveEvaluation(session.evaluationId);
      } catch {
        /* 이미 제출됐으므로 나가기 기록 실패는 무시합니다. */
      }
      // 제출 완료 화면에 이름과 평가 제목만 남기고 참가 정보(토큰)는 모두 지웁니다.
      submittedRef.current = true;
      saveSubmittedInfo({ title: session.evaluationTitle, nickname: session.nickname });
      clearSession();
      setSession(emptySession);
      setDialog("");
      navigate("/student/done", { replace: true });
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
    // 서버에 나간다고 알리지 못해도(내보내졌거나 연결이 끊겨도) 학생은 화면에서 나갈 수 있어야 합니다.
    if (session.evaluationId) await leaveEvaluation(session.evaluationId).catch(() => undefined);
    clearSession();
    setSession(emptySession);
    navigate("/", { replace: true });
  }

  function closeDialog() {
    if (dialog === "policy" && session.evaluationId) {
      sessionStorage.setItem(policyKey, "true");
    }
    setDialog("");
  }

  if (route === "/student/wait") {
    return (
      <>
        <ConnectionBanner
          state={connection}
          offlineMessage="연결이 끊겼어요. 다시 연결을 시도하고 있습니다."
        />
        <WaitingRoom
          nickname={session.nickname || user?.name || "학생"}
          onLeave={() => setDialog("leave")}
          notice={notice}
        />
        {/* 대기 화면에도 나가기 확인 창이 떠야 합니다. */}
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
      </>
    );
  }

  if (!isSolving) {
    const queryPin = new URLSearchParams(location.search).get("pin") ?? "";
    const routeNotice = (location.state as { notice?: string } | null)?.notice ?? "";
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
            onLeave={() => navigate("/", { replace: true })}
            onJoin={async (pin) => {
              const evaluation = await verifyPin(pin);
              // 참가 중인 평가의 PIN을 다시 넣으면 새로 참가하지 않고 작성하던 곳으로 돌아갑니다.
              if (
                evaluation.id === session.evaluationId &&
                getParticipantToken(evaluation.id)
              ) {
                navigate("/student/solve", { replace: true });
                return;
              }
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
        {(notice || routeNotice) && (
          <p className="student-flow-notice" role="status">
            {notice || routeNotice}
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
        {/* 실제 학생 화면 헤더와 같은 구조·클래스로 그려 로딩이 끝나도 위치가 바뀌지 않게 합니다. */}
        <header className="header student-header" aria-hidden="true">
          <span className="lit-logo-link">
            <img src="/lit-logo.png" width="100" height="50" alt="" />
          </span>
          <nav>
            <span className="icon-button">
              <Icon name="settings" />
            </span>
            <Button disabled>제출하기</Button>
          </nav>
        </header>
        {phone && (
          <div className="student-pane-tabs" aria-hidden="true">
            <div className="student-pane-switch">
              <button type="button" aria-pressed="true" tabIndex={-1}>
                작성
              </button>
              <button type="button" aria-pressed="false" tabIndex={-1}>
                AI 대화창
              </button>
            </div>
          </div>
        )}
        <div
          className="student-solving-body student-workspace-skeleton-body"
          style={
            { "--student-chat-width": `${readChatWidth()}%` } as CSSProperties
          }
          aria-hidden="true"
        >
          <main className="student-writing">
            <section className="student-editor student-workspace-skeleton-card">
              <Tabs
                label="문항"
                variant="segment"
                value="overview"
                items={[
                  { value: "overview", label: "안내" },
                  { value: "q1", label: "문항 1" },
                  { value: "q2", label: "문항 2" },
                  { value: "q3", label: "문항 3" },
                ]}
                onChange={() => undefined}
              />
              <Skeleton className="student-workspace-skeleton-title" />
              <Skeleton className="student-workspace-skeleton-lead" />
              <div className="student-workspace-skeleton-block">
                <Skeleton className="student-workspace-skeleton-heading" />
                <Skeleton className="student-workspace-skeleton-row" />
                <Skeleton className="student-workspace-skeleton-row" />
              </div>
              <div className="student-workspace-skeleton-block">
                <Skeleton className="student-workspace-skeleton-heading" />
                <Skeleton className="student-workspace-skeleton-line" />
                <Skeleton className="student-workspace-skeleton-line is-short" />
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
        {connection === "offline"
          ? "연결이 끊겼어요. 다시 연결되면 평가 정보를 자동으로 불러옵니다."
          : connection === "reconnecting"
            ? "다시 연결 중…"
            : notice || "평가 정보를 불러오지 못했습니다."}
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
      ref={solvingRef}
      className="student-solving compact-workspace"
      onCopy={(event) => event.preventDefault()}
      onScrollCapture={followPane}
    >
      <StudentHeader
        submitted={workspace.status === "SUBMITTED"}
        disabledSubmit={readOnly}
        onLeave={() => setDialog("leave")}
        onSubmit={() => void openSubmissionPreview()}
        onPolicy={() => setDialog("policy")}
        endInfo={endInfo}
      />
      <StudentWorkspace
        sidebarExpanded={chatExpanded}
        editor={
          <main className="student-writing">
            <AnswerEditor
              title={session.evaluationTitle}
              guidelines={workspace?.guidelines ?? ""}
              criteria={workspace?.criteria ?? []}
              antiCheat={workspace?.antiCheat ?? []}
              questions={questions}
              questionId={questionId}
              answers={answers}
              readOnly={readOnly}
              savingQuestionId={savingQuestionId}
              notice={
                connection === "offline"
                  ? "연결되면 자동으로 저장돼요."
                  : editorNotice
              }
              startOnQuestion={startOnQuestion}
              contentRevision={editorRevision}
              onQuestion={(id) => void selectQuestion(id)}
              onAnswer={(id, text) => {
                setAnswers((current) => ({ ...current, [id]: text }));
                setDirtyAnswers((current) => ({ ...current, [id]: true }));
                setEditorNotice("");
                setDraftFailed(
                  !saveAnswerDraft(session.evaluationId, id, {
                    content: text,
                    baseVersion: versions[id] ?? 0,
                  }),
                );
              }}
              onSave={(id) => void saveAnswer(id)}
            />
          </main>
        }
        chat={
          <StudentChatPanel
            expanded={chatExpanded}
            onExpandedChange={setChatExpanded}
            student={displayStudent}
            messages={messages}
            loadingHistory={loadingHistory}
            aiPolicy={workspace.aiPolicy}
            disabled={
              readOnly || workspace.aiPolicy === "DISABLED" || !connected
            }
            busy={aiBusy}
            notice={
              readOnly
                ? "제출 또는 평가 종료 후에는 AI 질문을 할 수 없습니다."
                : workspace.aiPolicy === "DISABLED"
                  ? "이 평가에서는 AI 사용이 허용되지 않았습니다."
                  : !connected
                    ? "연결이 끊겨 AI에게 질문할 수 없어요. 다시 연결되면 질문해주세요."
                    : chatNotice
            }
            onSend={(text) => void sendAiQuestion(text)}
          />
        }
      />
      {phone && (
        <div className="student-pane-tabs" role="group" aria-label="화면 전환">
          <div className="student-pane-switch">
            <button
              type="button"
              aria-pressed={pane === "answer"}
              onClick={() => showPane("answer")}
            >
              작성
            </button>
            <button
              type="button"
              aria-pressed={pane === "chat"}
              onClick={() => showPane("chat")}
            >
              AI 대화창
            </button>
          </div>
        </div>
      )}
      <ConnectionBanner
        state={connection}
        offlineMessage={
          draftFailed
            ? "연결이 끊겼어요. 작성 내용을 보관하지 못했으니 이 창을 닫지 말아주세요."
            : "연결이 끊겼어요. 작성 내용을 보관하고 있습니다."
        }
      />
      {!readOnly && !dialog && conflicts[0] && (
        <AnswerConflictDialog
          conflict={conflicts[0]}
          onResolve={resolveConflict}
        />
      )}
      <Toast message={timeToast} tone="info" onClose={() => setTimeToast("")} />
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
