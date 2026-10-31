import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  configureEvaluation,
  createEvaluation,
  endEvaluation,
  getEvaluation,
  getEvaluationConfiguration,
  getEvaluationQr,
  getParticipants,
  startEvaluation,
} from "../api/evaluations";
import { apiErrorMessage } from "../api/client";
import type {
  AiPolicy,
  Evaluation,
  Lobby,
  QuestionInput,
} from "../api/types";
import { Modal } from "../components/ui/Modal";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { RichTextEditor } from "../components/teacher/RichTextEditor";
import { Button } from "../components/ui/Button";
import { Skeleton, SkeletonStatus } from "../components/ui/Skeleton";
import { TextInput } from "../components/ui/TextInput";
import { evaluationCriteria } from "../data/landing";
import "../components/teacher/teacher.css";

type DraftQuestion = QuestionInput & { key: string };
const freshQuestion = (position: number): DraftQuestion => ({
  key: crypto.randomUUID(),
  position,
  title: `문항 ${position}`,
  content: "",
});
const toDraftQuestion = (question: QuestionInput): DraftQuestion => ({
  key: crypto.randomUUID(),
  position: question.position,
  title: question.title,
  content: question.content,
});
// 문항 제목 입력은 없애고 순서대로 "문항 N"을 서버에 보냅니다.
const toQuestionInput = (
  question: DraftQuestion,
  index: number,
): QuestionInput => ({
  position: index + 1,
  title: `문항 ${index + 1}`,
  content: question.content.trim(),
});
const moveQuestion = (
  questions: DraftQuestion[],
  fromKey: string,
  toIndex: number,
) => {
  const fromIndex = questions.findIndex((question) => question.key === fromKey);
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    toIndex >= questions.length ||
    fromIndex === toIndex
  )
    return questions;
  const next = [...questions];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((question, index) => ({ ...question, position: index + 1 }));
};
const MAX_EXPIRES_MINUTES = 1440;
const antiCheatOptions = [
  {
    id: "TAB_LEAVE",
    label: "창/탭 이탈 감지",
    description: "학생이 다른 창이나 탭으로 이동하면 기록합니다.",
  },
  {
    id: "PRINT_BLOCK",
    label: "프린트 금지",
    description: "평가 화면 인쇄(Ctrl+P)를 막습니다.",
  },
] as const;
type AntiCheatOption = (typeof antiCheatOptions)[number]["id"];
const toggleInOrder = <T,>(
  order: readonly T[],
  current: T[],
  item: T,
  checked: boolean,
) =>
  checked
    ? order.filter((value) => value === item || current.includes(value))
    : current.filter((value) => value !== item);

function QuestionFields({
  questions,
  disabled,
  onChange,
  onAdd,
  onRemove,
  onMove,
}: {
  questions: DraftQuestion[];
  disabled: boolean;
  onChange: (key: string, content: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onMove: (key: string, toIndex: number) => void;
}) {
  const [grabbedKey, setGrabbedKey] = useState<string | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  return (
    <div className="teacher-question-fields">
      {questions.map((question, index) => (
        <fieldset
          className={`teacher-question-field${draggingKey === question.key ? " is-dragging" : ""}`}
          key={question.key}
          disabled={disabled}
          draggable={!disabled && grabbedKey === question.key}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            setDraggingKey(question.key);
          }}
          onDragOver={(event) => {
            if (!draggingKey) return;
            event.preventDefault();
            if (draggingKey !== question.key) onMove(draggingKey, index);
          }}
          onDrop={(event) => event.preventDefault()}
          onDragEnd={() => {
            setDraggingKey(null);
            setGrabbedKey(null);
          }}
        >
          <legend>문항 {index + 1}</legend>
          <button
            className="teacher-drag-handle"
            type="button"
            aria-label={`문항 ${index + 1} 순서 이동 (위/아래 방향키)`}
            title="드래그해서 순서 바꾸기"
            onPointerDown={() => setGrabbedKey(question.key)}
            onPointerUp={() => setGrabbedKey(null)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
              event.preventDefault();
              onMove(question.key, index + (event.key === "ArrowUp" ? -1 : 1));
            }}
          >
            <svg
              width="20"
              height="12"
              viewBox="0 0 20 12"
              fill="currentColor"
              aria-hidden="true"
            >
              {[4, 10, 16].flatMap((x) =>
                [3, 9].map((y) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />
                )),
              )}
            </svg>
          </button>
          <textarea
            aria-label={`문항 ${index + 1} 내용`}
            placeholder="문항 내용을 입력하세요"
            maxLength={10000}
            value={question.content}
            onChange={(event) => onChange(question.key, event.target.value)}
          />
          <div className="teacher-question-footer">
            <button
              className="teacher-remove-question"
              type="button"
              aria-label={`문항 ${index + 1} 삭제`}
              title="삭제"
              disabled={questions.length <= 1}
              onClick={() => onRemove(question.key)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 7h16" />
                <path d="M10 11v6M14 11v6" />
                <path d="M6 7l1 13h10l1-13" />
                <path d="M9 7V4h6v3" />
              </svg>
            </button>
          </div>
        </fieldset>
      ))}
      <Button
        variant="secondary"
        type="button"
        disabled={disabled || questions.length >= 100}
        onClick={onAdd}
      >
        문항 추가
      </Button>
    </div>
  );
}

function ParticipantAvatar() {
  return (
    <span className="teacher-lobby-avatar" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="19" height="19">
        <circle cx="12" cy="8" r="4.2" fill="#3b82f6" />
        <path
          d="M3.5 21c0-4.4 3.8-7 8.5-7s8.5 2.6 8.5 7c0 .6-.4 1-1 1h-15c-.6 0-1-.4-1-1z"
          fill="#3b82f6"
        />
      </svg>
    </span>
  );
}

function EmptyParticipantsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="44"
      height="44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 13.8c2.3 0 4 1.6 4 4.2" />
    </svg>
  );
}

export function TeacherEvaluationPage() {
  const { evaluationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [evaluationGuidelines, setEvaluationGuidelines] = useState("");
  const [expiresHours, setExpiresHours] = useState("1");
  const [expiresMinutes, setExpiresMinutes] = useState("0");
  const [expiresError, setExpiresError] = useState("");
  const [antiCheat, setAntiCheat] = useState<AntiCheatOption[]>(
    antiCheatOptions.map((option) => option.id),
  );
  const [criteria, setCriteria] = useState<string[]>(
    evaluationCriteria.map((criterion) => criterion.title),
  );
  const expiresInMinutes =
    Number(expiresHours || 0) * 60 + Number(expiresMinutes || 0);
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
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(evaluationId));

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
    void (async () => {
      setLoading(true);
      if (navigationState?.draft) {
        setAiPolicy(navigationState.draft.aiPolicy);
        setQuestions(navigationState.draft.questions.map(toDraftQuestion));
      }
      if (navigationState?.notice) setNotice(navigationState.notice);
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
          setQuestions(nextConfiguration.questions.map(toDraftQuestion));
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

  const questionHandlers = {
    onChange: (key: string, content: string) =>
      setQuestions((current) =>
        current.map((question) =>
          question.key === key ? { ...question, content } : question,
        ),
      ),
    onAdd: () =>
      setQuestions((current) => [...current, freshQuestion(current.length + 1)]),
    onRemove: (key: string) =>
      setQuestions((current) =>
        current
          .filter((item) => item.key !== key)
          .map((item, index) => ({ ...item, position: index + 1 })),
      ),
    onMove: (key: string, toIndex: number) =>
      setQuestions((current) => moveQuestion(current, key, toIndex)),
  };

  function validateExpiry() {
    if (
      !Number.isInteger(expiresInMinutes) ||
      expiresInMinutes < 1 ||
      expiresInMinutes > MAX_EXPIRES_MINUTES ||
      Number(expiresMinutes) > 59
    ) {
      setExpiresError("1분 ~ 24시간 사이로 입력해주세요. (분은 0~59)");
      return false;
    }
    setExpiresError("");
    return true;
  }

  function continueToQuestions() {
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!aiPolicy) {
      setNotice("AI 사용 정책을 선택해주세요.");
      return;
    }
    if (!title.trim() || title.trim().length > 100) {
      setTitleError("평가 제목을 공백 없이 100자 이내로 입력해주세요.");
      return;
    }
    setTitleError("");
    if (!validateExpiry()) return;
    if (!criteria.length) {
      setNotice("평가 항목을 1개 이상 선택해주세요.");
      return;
    }
    setCreateStep("questions");
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
    if (!validateExpiry()) {
      setCreateStep("details");
      return;
    }
    if (
      questions.length < 1 ||
      questions.length > 100 ||
      questions.some((question) => !question.content.trim())
    ) {
      setNotice("문항은 1~100개이며, 모든 문항의 내용을 입력해야 합니다.");
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
      // 부정행위 설정·평가 항목은 아직 API 필드가 없어 평가 기준 메모처럼 이 기기에만 저장합니다.
      localStorage.setItem(
        `lit:evaluation-settings:${created.id}`,
        JSON.stringify({ antiCheat, criteria }),
      );
      const config = { aiPolicy, questions: questions.map(toQuestionInput) };
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

  if (loading)
    return (
      <main className="teacher-page teacher-loading-page">
        <header className="header teacher-header" aria-hidden="true">
          <Skeleton style={{ width: 100, height: 40 }} />
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
            style={{ width: 190, height: 20, marginBottom: 10 }}
          />
          <Skeleton
            style={{ width: "min(520px, 75vw)", height: "clamp(46px, 4.8vw, 60px)", marginBottom: 24 }}
          />
          <div className="teacher-dashboard-grid" aria-hidden="true">
            <section className="teacher-card teacher-evaluation-card teacher-card-skeleton">
              <div className="teacher-loading-skeleton-pair">
                <Skeleton style={{ width: 150, height: 52 }} />
                <Skeleton style={{ width: 92, height: 42, borderRadius: 10 }} />
              </div>
              <Skeleton style={{ width: "72%", height: 22 }} />
              <Skeleton style={{ width: "85%", height: 22 }} />
              <div className="teacher-loading-skeleton-pair">
                <Skeleton style={{ width: 135, height: 42, borderRadius: 10 }} />
                <Skeleton style={{ width: 135, height: 42, borderRadius: 10 }} />
              </div>
            </section>
            <section className="teacher-card teacher-card-skeleton teacher-skeleton-participants">
              <Skeleton style={{ width: 135, height: 28 }} />
              <Skeleton style={{ width: "100%", height: 42 }} />
              <Skeleton style={{ width: "100%", height: 42 }} />
              <Skeleton style={{ width: "100%", height: 42 }} />
            </section>
            <section className="teacher-card teacher-config-card teacher-card-skeleton">
              <Skeleton style={{ width: 170, height: 28 }} />
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
      <TeacherHeader onLeave={() => navigate("/teacher/evaluations")}>
        {evaluation?.state === "STARTED" ? (
          <Button
            variant="white-danger"
            disabled={busy}
            onClick={() => void changeEvaluationState("end")}
          >
            평가 종료하기
          </Button>
        ) : (
          <Button
            disabled={
              busy ||
              evaluation?.state !== "WAITING" ||
              !lobby?.participantCount
            }
            title={
              evaluation?.state === "WAITING"
                ? undefined
                : "이미 종료된 평가는 다시 시작할 수 없습니다."
            }
            onClick={() => void changeEvaluationState("start")}
          >
            평가 시작하기
          </Button>
        )}
      </TeacherHeader>

      <div className="teacher-page-content">
        {!evaluationId && (
          <p className="teacher-eyebrow">TEACHER / EVALUATION</p>
        )}
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
                  <fieldset className="teacher-expiry-field" disabled={busy}>
                    <legend>유효 시간</legend>
                    <div
                      className="teacher-expiry-inputs"
                      data-error={!!expiresError}
                    >
                      <label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={24}
                          value={expiresHours}
                          aria-label="시간"
                          onChange={(event) =>
                            setExpiresHours(event.target.value)
                          }
                        />
                        시간
                      </label>
                      <label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={59}
                          value={expiresMinutes}
                          aria-label="분"
                          onChange={(event) =>
                            setExpiresMinutes(event.target.value)
                          }
                        />
                        분
                      </label>
                    </div>
                  </fieldset>
                </div>
                {expiresError && (
                  <p className="input-error teacher-expiry-error">
                    {expiresError}
                  </p>
                )}
                <RichTextEditor
                  label="평가 내용"
                  description="평가 기준이나 규칙을 적어주세요. 현재 API에서는 서버 저장 및 학생 공유를 지원하지 않습니다."
                  value={evaluationGuidelines}
                  disabled={busy}
                  placeholder="예: 답안에는 풀이 과정을 포함해주세요. AI는 개념 이해를 위한 힌트만 사용할 수 있습니다."
                  onChange={setEvaluationGuidelines}
                />
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
                <fieldset className="teacher-check-group" disabled={busy}>
                  <legend>
                    평가 항목 <small>채점에 사용할 기준을 선택하세요.</small>
                  </legend>
                  {evaluationCriteria.map((criterion) => (
                    <label key={criterion.title} className="teacher-check">
                      <input
                        type="checkbox"
                        checked={criteria.includes(criterion.title)}
                        onChange={(event) =>
                          setCriteria((current) =>
                            toggleInOrder(
                              evaluationCriteria.map((item) => item.title),
                              current,
                              criterion.title,
                              event.target.checked,
                            ),
                          )
                        }
                      />
                      <span>
                        <strong>{criterion.title}</strong>
                        <small>{criterion.description}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <fieldset className="teacher-check-group" disabled={busy}>
                  <legend>
                    부정행위 방지{" "}
                    <small>
                      현재 API에서는 서버 저장 및 학생 화면 적용을 지원하지
                      않습니다.
                    </small>
                  </legend>
                  {antiCheatOptions.map((option) => (
                    <label key={option.id} className="teacher-check">
                      <input
                        type="checkbox"
                        checked={antiCheat.includes(option.id)}
                        onChange={(event) =>
                          setAntiCheat((current) =>
                            toggleInOrder(
                              antiCheatOptions.map((item) => item.id),
                              current,
                              option.id,
                              event.target.checked,
                            ),
                          )
                        }
                      />
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
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
                  {...questionHandlers}
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
          <div className="teacher-lobby">
            <section className="teacher-card teacher-join-card">
              <div>
                <p className="teacher-join-label">참여 PIN</p>
                <p className="teacher-lobby-pin">{evaluation.pin}</p>
                <p className="teacher-join-hint">
                  QR코드를 스캔하거나 PIN을 입력해 참여하세요
                </p>
              </div>
              <div className="teacher-join-qr">
                {qrUrl ? (
                  <button
                    type="button"
                    className="teacher-lobby-qr-button"
                    aria-label="QR 코드 크게 보기"
                    onClick={() => setQrOpen(true)}
                  >
                    <img
                      className="teacher-lobby-qr"
                      src={qrUrl}
                      alt="학생 참가용 QR 코드"
                    />
                  </button>
                ) : (
                  <div className="teacher-lobby-qr" aria-hidden="true" />
                )}
              </div>
            </section>

            <section className="teacher-card teacher-lobby-people">
              <div className="teacher-lobby-people-head">
                <h2>참여자</h2>
              </div>
              {lobby?.participants.length ? (
                <ul className="teacher-lobby-pills">
                  {lobby.participants.map((participant) => (
                    <li
                      key={participant.id}
                      className={`teacher-lobby-pill${participant.presence === "CONNECTED" ? "" : " is-offline"}`}
                    >
                      <ParticipantAvatar />
                      <span>{participant.nickname}</span>
                      {participant.presence !== "CONNECTED" && (
                        <small>연결 끊김</small>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="teacher-lobby-empty">
                  <EmptyParticipantsIcon />
                  <p>참여자를 기다리고 있습니다.</p>
                  {evaluation.state === "WAITING" && (
                    <small>
                      연결된 학생이 1명 이상이어야 평가를 시작할 수 있습니다.
                    </small>
                  )}
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="teacher-card">
            <p>평가 정보를 불러오지 못했습니다.</p>
            <Link to="/teacher/evaluations/new">새 평가 만들기</Link>
          </section>
        )}
      </div>
      {qrOpen && qrUrl && (
        <Modal
          title="참여 QR 코드"
          className="teacher-qr-modal"
          onClose={() => setQrOpen(false)}
        >
          <img
            className="teacher-qr-large"
            src={qrUrl}
            alt="학생 참가용 QR 코드 (확대)"
          />
        </Modal>
      )}
    </main>
  );
}
