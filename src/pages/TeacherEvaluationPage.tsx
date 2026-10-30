import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  configureEvaluation,
  createEvaluation,
  deleteEvaluation,
  endEvaluation,
  getEvaluation,
  getEvaluationConfiguration,
  getEvaluationQr,
  getParticipants,
  getTeacherLearningEvents,
  startEvaluation,
} from "../api/evaluations";
import { createTeacherInvitation } from "../api/auth";
import { apiErrorMessage } from "../api/client";
import type {
  AiPolicy,
  Evaluation,
  LearningEvent,
  Lobby,
  QuestionInput,
} from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { DeleteEvaluationDialog } from "../components/teacher/DeleteEvaluationDialog";
import { Button } from "../components/ui/Button";
import { Skeleton, SkeletonStatus } from "../components/ui/Skeleton";
import { TextInput } from "../components/ui/TextInput";
import "../components/teacher/teacher.css";

type DraftQuestion = QuestionInput & { key: string };
const freshQuestion = (position: number): DraftQuestion => ({
  key: crypto.randomUUID(),
  position,
  title: `문항 ${position}`,
  content: "",
});
const visibleEventDetails = (details: Record<string, unknown>) =>
  Object.fromEntries(
    ["questionId", "source", "answerVersion", "errorCode"].flatMap((key) => {
      const value = details[key];
      return typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
        ? [[key, value]]
        : [];
    }),
  );

function QuestionFields({
  questions,
  disabled,
  onChange,
  onAdd,
  onRemove,
  showAdd = true,
  showRemove = true,
}: {
  questions: DraftQuestion[];
  disabled: boolean;
  onChange: (key: string, field: "title" | "content", value: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  showAdd?: boolean;
  showRemove?: boolean;
}) {
  return (
    <div className="teacher-question-fields">
      {questions.map((question, index) => (
        <fieldset
          className="teacher-question-field"
          key={question.key}
          disabled={disabled}
        >
          <legend>문항 {index + 1}</legend>
          <TextInput
            label="문항 제목"
            maxLength={200}
            value={question.title}
            onChange={(event) =>
              onChange(question.key, "title", event.target.value)
            }
          />
          <label className="teacher-textarea-label">
            <span>문항 내용</span>
            <textarea
              maxLength={10000}
              value={question.content}
              onChange={(event) =>
                onChange(question.key, "content", event.target.value)
              }
            />
          </label>
          {showRemove && questions.length > 1 && (
            <button
              className="teacher-remove-question"
              type="button"
              onClick={() => onRemove(question.key)}
            >
              문항 삭제
            </button>
          )}
        </fieldset>
      ))}
      {showAdd && (
        <Button
          variant="secondary"
          type="button"
          disabled={disabled || questions.length >= 100}
          onClick={onAdd}
        >
          문항 추가
        </Button>
      )}
    </div>
  );
}

export function TeacherEvaluationPage() {
  const { evaluationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [evaluationGuidelines, setEvaluationGuidelines] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState(60);
  const [aiPolicy, setAiPolicy] = useState<AiPolicy | "">("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    freshQuestion(1),
  ]);
  const [createStep, setCreateStep] = useState<"details" | "questions">(
    "details",
  );
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [events, setEvents] = useState<LearningEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(evaluationId));
  const isWaiting = evaluation?.state === "WAITING";
  const joinUrl = useMemo(() => {
    if (!evaluation) return "";
    return `${window.location.origin}/student/join?pin=${encodeURIComponent(evaluation.pin)}`;
  }, [evaluation]);

  const refreshLobby = useCallback(async () => {
    if (!evaluationId) return;
    const next = await getParticipants(evaluationId);
    setLobby(next);
  }, [evaluationId]);

  useEffect(() => {
    if (!evaluationId) return;
    let active = true;
    const navigationState = location.state as {
      draft?: { aiPolicy: AiPolicy; questions: QuestionInput[] };
      notice?: string;
    } | null;
    if (navigationState?.draft) {
      setAiPolicy(navigationState.draft.aiPolicy);
      setQuestions(
        navigationState.draft.questions.map((question) => ({
          ...question,
          key: crypto.randomUUID(),
        })),
      );
    }
    if (navigationState?.notice) setNotice(navigationState.notice);
    void (async () => {
      setLoading(true);
      try {
        const [nextEvaluation, nextConfiguration] = await Promise.all([
          getEvaluation(evaluationId),
          getEvaluationConfiguration(evaluationId),
        ]);
        if (!active) return;
        setEvaluation(nextEvaluation);
        setAiPolicy(nextConfiguration.aiPolicy as AiPolicy);
        setEvaluationGuidelines(
          localStorage.getItem(`lit:evaluation-guidelines:${evaluationId}`) ??
            "",
        );
        if (!navigationState?.draft) {
          setQuestions(
            nextConfiguration.questions.map(({ id: _id, ...question }) => ({
              ...question,
              key: crypto.randomUUID(),
            })),
          );
        }
        await refreshLobby();
        try {
          const blob = await getEvaluationQr(evaluationId);
          if (active) setQrUrl(URL.createObjectURL(blob));
        } catch {
          if (active)
            setNotice(
              (current) => current || "QR 이미지를 불러오지 못했습니다.",
            );
        }
      } catch (error) {
        if (active)
          setNotice(apiErrorMessage(error, "평가 정보를 불러오지 못했습니다."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [evaluationId, location.state, refreshLobby]);

  useEffect(
    () => () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    },
    [qrUrl],
  );

  useEffect(() => {
    if (
      !evaluationId ||
      evaluation?.state === "ENDED" ||
      evaluation?.state === "EXPIRED"
    )
      return;
    const timer = window.setInterval(() => {
      void refreshLobby().catch((error) => setNotice(apiErrorMessage(error)));
    }, 4000);
    return () => window.clearInterval(timer);
  }, [evaluationId, evaluation?.state, refreshLobby]);

  const updateQuestion = (
    key: string,
    field: "title" | "content",
    value: string,
  ) => {
    setQuestions((current) =>
      current.map((question) =>
        question.key === key ? { ...question, [field]: value } : question,
      ),
    );
  };

  function continueToQuestions() {
    setNotice("");
    if (!aiPolicy) {
      setNotice("AI 사용 정책을 선택해주세요.");
      return;
    }
    if (!title.trim() || title.trim().length > 100) {
      setTitleError("평가 제목을 공백 없이 100자 이내로 입력해주세요.");
      return;
    }
    setTitleError("");
    setCreateStep("questions");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (!title.trim() || title.trim().length > 100) {
      setTitleError("평가 제목을 공백 없이 100자 이내로 입력해주세요.");
      return;
    }
    setTitleError("");
    if (!aiPolicy) {
      setNotice("AI 사용 정책을 선택해주세요.");
      setCreateStep("details");
      return;
    }
    if (
      questions.length < 1 ||
      questions.length > 100 ||
      questions.some(
        (question) => !question.title.trim() || !question.content.trim(),
      )
    ) {
      setNotice("문항은 1~100개이며, 제목과 내용을 모두 입력해야 합니다.");
      return;
    }
    setBusy(true);
    try {
      const created = await createEvaluation({
        title: title.trim(),
        expiresInMinutes,
      });
      localStorage.setItem(
        `lit:evaluation-guidelines:${created.id}`,
        evaluationGuidelines,
      );
      const config = {
        aiPolicy,
        questions: questions.map(({ key: _key, ...question }, index) => ({
          ...question,
          position: index + 1,
          title: question.title.trim(),
          content: question.content.trim(),
        })),
      };
      try {
        await configureEvaluation(created.id, config);
        navigate(`/teacher/evaluations/${encodeURIComponent(created.id)}`, {
          replace: true,
        });
      } catch (error) {
        navigate(`/teacher/evaluations/${encodeURIComponent(created.id)}`, {
          replace: true,
          state: {
            draft: config,
            notice: `평가는 생성됐지만 문항 설정에 실패했습니다. 다시 저장해주세요. ${apiErrorMessage(error)}`,
          },
        });
      }
    } catch (error) {
      setNotice(apiErrorMessage(error, "평가를 생성하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function saveConfiguration() {
    if (!evaluationId) return;
    if (!aiPolicy) {
      setNotice("AI 사용 정책을 선택해주세요.");
      return;
    }
    setNotice("");
    if (
      questions.length < 1 ||
      questions.some(
        (question) => !question.title.trim() || !question.content.trim(),
      )
    ) {
      setNotice("각 문항의 제목과 내용을 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const config = await configureEvaluation(evaluationId, {
        aiPolicy,
        questions: questions.map(({ key: _key, ...question }, index) => ({
          ...question,
          position: index + 1,
          title: question.title.trim(),
          content: question.content.trim(),
        })),
      });
      setQuestions(
        config.questions.map(({ id: _id, ...question }) => ({
          ...question,
          key: crypto.randomUUID(),
        })),
      );
      setNotice("평가 설정을 저장했습니다.");
    } catch (error) {
      setNotice(apiErrorMessage(error, "평가 설정을 저장하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function changeEvaluationState(action: "start" | "end") {
    if (!evaluationId) return;
    setBusy(true);
    setNotice("");
    try {
      const next =
        action === "start"
          ? await startEvaluation(evaluationId)
          : await endEvaluation(evaluationId);
      setLobby(next);
      setEvaluation((current) =>
        current ? { ...current, state: next.state } : current,
      );
    } catch (error) {
      setNotice(apiErrorMessage(error, "평가 상태를 변경하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function removeEvaluation() {
    if (!evaluationId || !evaluation) return;
    await deleteEvaluation(evaluationId);
    try {
      localStorage.removeItem(`lit:evaluation-guidelines:${evaluationId}`);
    } catch {
      // Successful server deletion does not depend on browser storage access.
    }
    navigate("/teacher/evaluations", {
      replace: true,
      state: { notice: `‘${evaluation.title}’ 평가를 삭제했습니다.` },
    });
  }

  async function loadEvents(participantId: string) {
    if (!evaluationId) return;
    setSelectedParticipant(participantId);
    setEvents([]);
    setEventsLoading(true);
    try {
      setEvents(await getTeacherLearningEvents(evaluationId, participantId));
    } catch (error) {
      setNotice(apiErrorMessage(error, "학습 기록을 불러오지 못했습니다."));
    } finally {
      setEventsLoading(false);
    }
  }

  function saveGuidelinesForThisDevice() {
    if (!evaluationId) return;
    localStorage.setItem(
      `lit:evaluation-guidelines:${evaluationId}`,
      evaluationGuidelines,
    );
    setNotice(
      "평가 기준을 이 기기에 저장했습니다. 학생에게 공유되지는 않습니다.",
    );
  }

  async function issueInvite() {
    setNotice("");
    setBusy(true);
    try {
      const invitation = await createTeacherInvitation(24);
      setInviteCode(invitation.inviteCode);
    } catch (error) {
      setNotice(apiErrorMessage(error, "초대 코드를 발급하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <main className="teacher-page teacher-loading-page">
        <header className="teacher-page-header" aria-hidden="true">
          <Skeleton style={{ width: 70, height: 30 }} />
          <div className="teacher-loading-header-actions">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        </header>
        <SkeletonStatus
          className="teacher-page-content teacher-detail-skeleton"
          label="평가 정보를 불러오고 있습니다."
        >
          <Skeleton
            className="teacher-skeleton-eyebrow"
            style={{ width: 190, height: 16, marginBottom: 14 }}
          />
          <Skeleton
            style={{ width: "min(520px, 75vw)", height: 48, marginBottom: 24 }}
          />
          <div className="teacher-dashboard-grid" aria-hidden="true">
            <section className="teacher-card teacher-evaluation-card teacher-card-skeleton">
              <div className="teacher-loading-skeleton-pair">
                <Skeleton style={{ width: 150, height: 52 }} />
                <Skeleton style={{ width: 92, height: 38 }} />
              </div>
              <Skeleton style={{ width: "72%", height: 16 }} />
              <Skeleton style={{ width: "85%", height: 16 }} />
              <div className="teacher-loading-skeleton-pair">
                <Skeleton style={{ width: 135, height: 38 }} />
                <Skeleton style={{ width: 135, height: 38 }} />
              </div>
            </section>
            <section className="teacher-card teacher-card-skeleton teacher-skeleton-participants">
              <Skeleton style={{ width: 135, height: 23 }} />
              <Skeleton style={{ width: "100%", height: 42 }} />
              <Skeleton style={{ width: "100%", height: 42 }} />
              <Skeleton style={{ width: "100%", height: 42 }} />
            </section>
            <section className="teacher-card teacher-config-card teacher-card-skeleton">
              <Skeleton style={{ width: 170, height: 26 }} />
              <Skeleton style={{ width: "38%", height: 42 }} />
              <Skeleton style={{ width: "100%", height: 120 }} />
              <Skeleton style={{ width: "100%", height: 120 }} />
            </section>
          </div>
        </SkeletonStatus>
      </main>
    );

  return (
    <main className="teacher-page">
      <header className="teacher-page-header">
        <Link className="teacher-brand" to="/">
          LIT<span>.</span>
        </Link>
        <div className="teacher-account">
          <Link to="/teacher/evaluations">내 수행평가</Link>
          <span>{user?.name} 선생님</span>
          <Button
            variant="secondary"
            onClick={() => void logout().then(() => navigate("/login"))}
          >
            로그아웃
          </Button>
        </div>
      </header>

      <div className="teacher-page-content">
        <p className="teacher-eyebrow">TEACHER / EVALUATION</p>
        <h1>{evaluation ? evaluation.title : "새 평가 만들기"}</h1>
        {notice && (
          <p className="teacher-notice" role="status">
            {notice}
          </p>
        )}

        {!evaluationId ? (
          <form
            className="teacher-card teacher-create-card"
            onSubmit={(event) => {
              if (createStep === "details") {
                event.preventDefault();
                continueToQuestions();
                return;
              }
              void submitCreate(event);
            }}
          >
            <div className="teacher-create-stepper" aria-label="평가 생성 단계">
              <span
                className={
                  createStep === "details" ? "is-current" : "is-complete"
                }
                aria-current={createStep === "details" ? "step" : undefined}
              >
                <span className="teacher-step-number">1</span>
                <span>평가 정보</span>
              </span>
              <span
                className={createStep === "questions" ? "is-current" : ""}
                aria-current={createStep === "questions" ? "step" : undefined}
              >
                <span className="teacher-step-number">2</span>
                <span>문항 작성</span>
              </span>
            </div>
            {createStep === "details" ? (
              <>
                <div className="teacher-form-grid">
                  <TextInput
                    label="평가 제목"
                    maxLength={100}
                    required
                    value={title}
                    error={titleError}
                    disabled={busy}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTitle(value);
                      if (value.trim() && value.trim().length <= 100)
                        setTitleError("");
                    }}
                  />
                  <label className="teacher-select-label">
                    <span>유효 시간</span>
                    <select
                      value={expiresInMinutes}
                      disabled={busy}
                      onChange={(event) =>
                        setExpiresInMinutes(Number(event.target.value))
                      }
                    >
                      <option value={30}>30분</option>
                      <option value={60}>1시간</option>
                      <option value={180}>3시간</option>
                      <option value={360}>6시간</option>
                      <option value={1440}>24시간</option>
                    </select>
                  </label>
                </div>
                <label className="teacher-textarea-label teacher-guidelines-label">
                  <span>
                    평가 내용{" "}
                    <small>
                      평가 기준이나 규칙을 적어주세요. 현재 API에서는 서버 저장
                      및 학생 공유를 지원하지 않습니다.
                    </small>
                  </span>
                  <textarea
                    maxLength={10000}
                    value={evaluationGuidelines}
                    disabled={busy}
                    placeholder="예: 답안에는 풀이 과정을 포함해주세요. AI는 개념 이해를 위한 힌트만 사용할 수 있습니다."
                    onChange={(event) =>
                      setEvaluationGuidelines(event.target.value)
                    }
                  />
                </label>
                <div className="teacher-policy-row">
                  <label className="teacher-select-label">
                    <span>
                      AI 사용 정책{" "}
                      <small>
                        명세의 5단계 세부 정책은 API 미지원이며, 현재는 서버가
                        지원하는 3개 옵션만 저장됩니다.
                      </small>
                    </span>
                    <select
                      value={aiPolicy}
                      disabled={busy}
                      onChange={(event) =>
                        setAiPolicy(event.target.value as AiPolicy | "")
                      }
                    >
                      <option value="">정책을 선택해주세요</option>
                      <option value="DISABLED">사용 안 함</option>
                      <option value="HINT_ONLY">힌트만 허용</option>
                      <option value="FULL">전체 응답 허용</option>
                    </select>
                  </label>
                </div>
                <div className="teacher-form-actions teacher-form-actions--end">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={continueToQuestions}
                  >
                    다음
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="teacher-step-hint">
                  <strong>{title.trim()}</strong> 문항을 작성하고, 필요하면 문항
                  추가 버튼으로 더 추가하세요.
                </p>
                <QuestionFields
                  questions={questions}
                  disabled={busy}
                  onChange={updateQuestion}
                  onAdd={() =>
                    setQuestions((current) => [
                      ...current,
                      freshQuestion(current.length + 1),
                    ])
                  }
                  onRemove={(key) =>
                    setQuestions((current) =>
                      current
                        .filter((item) => item.key !== key)
                        .map((item, index) => ({
                          ...item,
                          position: index + 1,
                        })),
                    )
                  }
                />
                <div className="teacher-form-actions">
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setNotice("");
                      setCreateStep("details");
                    }}
                  >
                    이전
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {busy ? "생성 중…" : "평가 생성"}
                  </Button>
                </div>
              </>
            )}
          </form>
        ) : evaluation ? (
          <div className="teacher-dashboard-grid">
            <section className="teacher-card teacher-evaluation-card">
              <div className="teacher-evaluation-top">
                <div>
                  <p>평가 상태</p>
                  <strong>{evaluation.state}</strong>
                </div>
                <div>
                  <p>참여 PIN</p>
                  <strong className="teacher-pin">{evaluation.pin}</strong>
                </div>
              </div>
              <p className="teacher-expiry">
                만료 {new Date(evaluation.expiresAt).toLocaleString("ko-KR")}
              </p>
              <div className="teacher-join-link">
                <a href={joinUrl} target="_blank" rel="noreferrer">
                  참여 링크 열기 <span aria-hidden="true">↗</span>
                </a>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void navigator.clipboard
                      ?.writeText(joinUrl)
                      .then(() => setNotice("참여 링크를 복사했습니다."))
                  }
                >
                  링크 복사
                </Button>
              </div>
              {qrUrl && (
                <img
                  className="teacher-qr"
                  src={qrUrl}
                  alt="학생 참가용 QR 코드"
                />
              )}
              <div className="teacher-state-actions">
                {evaluation.state === "WAITING" && (
                  <Button
                    disabled={busy || !lobby?.participantCount}
                    onClick={() => void changeEvaluationState("start")}
                  >
                    평가 시작
                  </Button>
                )}
                {evaluation.state === "STARTED" && (
                  <Button
                    variant="white-danger"
                    disabled={busy}
                    onClick={() => void changeEvaluationState("end")}
                  >
                    평가 종료
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() =>
                    void refreshLobby().catch((error) =>
                      setNotice(apiErrorMessage(error)),
                    )
                  }
                >
                  참가자 새로고침
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      `/teacher/evaluations/${encodeURIComponent(evaluation.id)}/results`,
                    )
                  }
                >
                  학습 기록 보기
                </Button>
              </div>
              {evaluation.state === "WAITING" && !lobby?.participantCount && (
                <p className="teacher-hint">
                  연결된 학생이 1명 이상이어야 평가를 시작할 수 있습니다.
                </p>
              )}
            </section>

            <section className="teacher-card teacher-invite-card">
              <div className="teacher-card-heading">
                <h2>교사 초대 코드</h2>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void issueInvite()}
                >
                  24시간 코드 발급
                </Button>
              </div>
              {inviteCode ? (
                <p
                  className="teacher-invite-code"
                  aria-label="발급된 교사 초대 코드"
                >
                  {inviteCode}
                </p>
              ) : (
                <p className="teacher-hint">
                  같은 학교의 교사가 가입할 때 사용할 일회용 코드를 발급합니다.
                </p>
              )}
            </section>

            <section className="teacher-card teacher-participants-card">
              <div className="teacher-card-heading">
                <h2>
                  참가자 <span>{lobby?.participantCount ?? 0}</span>
                </h2>
                <span className="teacher-live-dot">실시간 갱신</span>
              </div>
              {lobby?.participants.length ? (
                <ul className="teacher-participant-list">
                  {lobby.participants.map((participant) => (
                    <li key={participant.id}>
                      <button
                        className={
                          selectedParticipant === participant.id
                            ? "is-selected"
                            : ""
                        }
                        type="button"
                        onClick={() => void loadEvents(participant.id)}
                      >
                        <span>{participant.nickname}</span>
                        <span
                          className={`presence presence-${participant.presence.toLowerCase()}`}
                        >
                          {participant.presence === "CONNECTED"
                            ? "접속 중"
                            : "연결 끊김"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="teacher-hint">
                  아직 참가자가 없습니다. PIN 또는 QR을 공유하세요.
                </p>
              )}
            </section>

            <section className="teacher-card teacher-events-card">
              <div className="teacher-card-heading">
                <h2>학생 학습 기록</h2>
                {selectedParticipant && (
                  <span className="teacher-event-count">{events.length}개</span>
                )}
              </div>
              {selectedParticipant ? (
                eventsLoading ? (
                  <SkeletonStatus
                    className="teacher-event-list-skeleton"
                    label="학생 학습 기록을 불러오고 있습니다."
                  >
                    {Array.from({ length: 4 }, (_, index) => (
                      <div
                        className="teacher-loading-event-row"
                        key={index}
                        aria-hidden="true"
                      >
                        <Skeleton style={{ width: 120, height: 15 }} />
                        <Skeleton style={{ width: 150, height: 15 }} />
                        <Skeleton
                          style={{
                            gridColumn: "1 / -1",
                            width: "74%",
                            height: 14,
                          }}
                        />
                      </div>
                    ))}
                  </SkeletonStatus>
                ) : events.length ? (
                  <ol className="teacher-event-list">
                    {events.map((event) => (
                      <li key={event.id}>
                        <span className="event-type">{event.type}</span>
                        <time>
                          {new Date(event.createdAt).toLocaleString("ko-KR")}
                        </time>
                        <pre>
                          {JSON.stringify(
                            visibleEventDetails(event.details),
                            null,
                            2,
                          )}
                        </pre>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="teacher-hint">표시할 학습 기록이 없습니다.</p>
                )
              ) : (
                <p className="teacher-hint">
                  참가자를 선택하면 해당 평가의 학습 이벤트가 표시됩니다.
                </p>
              )}
            </section>

            <section className="teacher-card teacher-config-card">
              <div className="teacher-card-heading">
                <h2>문항 및 AI 정책</h2>
                <Button
                  disabled={busy || !isWaiting}
                  onClick={() => void saveConfiguration()}
                >
                  {busy ? "저장 중…" : "설정 저장"}
                </Button>
              </div>
              {!isWaiting && (
                <p className="teacher-hint">
                  평가가 시작된 뒤에는 설정을 변경할 수 없습니다.
                </p>
              )}
              <label className="teacher-select-label">
                <span>AI 사용 정책</span>
                <select
                  value={aiPolicy}
                  disabled={busy || !isWaiting}
                  onChange={(event) =>
                    setAiPolicy(event.target.value as AiPolicy)
                  }
                >
                  <option value="DISABLED">사용 안 함</option>
                  <option value="HINT_ONLY">힌트만 허용</option>
                  <option value="FULL">전체 응답 허용</option>
                </select>
              </label>
              <QuestionFields
                questions={questions}
                disabled={busy || !isWaiting}
                onChange={updateQuestion}
                onAdd={() =>
                  setQuestions((current) => [
                    ...current,
                    freshQuestion(current.length + 1),
                  ])
                }
                onRemove={(key) =>
                  setQuestions((current) =>
                    current
                      .filter((item) => item.key !== key)
                      .map((item, index) => ({ ...item, position: index + 1 })),
                  )
                }
              />
            </section>

            <section className="teacher-card teacher-config-card">
              <div className="teacher-card-heading">
                <h2>평가 기준 메모</h2>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={saveGuidelinesForThisDevice}
                >
                  이 기기에 저장
                </Button>
              </div>
              <p className="teacher-hint">
                명세의 평가 기준 입력 칸입니다. 현재 서버 API가 평가 설명/세부
                규칙 필드를 제공하지 않아 이 메모는 이 브라우저에만 저장되고
                학생 화면에는 전달되지 않습니다.
              </p>
              <label className="teacher-textarea-label teacher-guidelines-label">
                <span>평가 기준이나 규칙</span>
                <textarea
                  maxLength={10000}
                  value={evaluationGuidelines}
                  disabled={busy}
                  placeholder="예: 답안에는 풀이 과정을 포함하고, 결론에는 근거를 제시해주세요."
                  onChange={(event) =>
                    setEvaluationGuidelines(event.target.value)
                  }
                />
              </label>
            </section>
            <section
              className="teacher-card teacher-delete-section"
              aria-labelledby="evaluation-delete-heading"
            >
              <div>
                <h2 id="evaluation-delete-heading">평가 삭제</h2>
                <p>
                  더 이상 필요하지 않은 평가를 삭제합니다. 삭제 전 평가와 학습
                  기록을 확인해주세요.
                </p>
              </div>
              <Button
                variant="white-danger"
                disabled={busy}
                onClick={() => setDeleteOpen(true)}
              >
                평가 삭제하기
              </Button>
            </section>
          </div>
        ) : (
          <section className="teacher-card">
            <p>평가 정보를 불러오지 못했습니다.</p>
            <Link to="/teacher/evaluations/new">새 평가 만들기</Link>
          </section>
        )}
      </div>
      {deleteOpen && evaluation && (
        <DeleteEvaluationDialog
          title={evaluation.title}
          onConfirm={removeEvaluation}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </main>
  );
}
