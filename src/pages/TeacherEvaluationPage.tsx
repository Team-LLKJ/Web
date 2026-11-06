import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { EmptyState } from "../components/ui/EmptyState";
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
import { ApiError, apiErrorMessage } from "../api/client";
import type {
  AiPolicy,
  Evaluation,
  Lobby,
  QuestionInput,
} from "../api/types";
import { Modal } from "../components/ui/Modal";
import { QuestionFields } from "../components/teacher/QuestionFields";
import {
  freshQuestion,
  moveQuestion,
  toDraftQuestion,
  toQuestionInput,
  questionLimitError,
  type DraftQuestion,
} from "../components/teacher/questionDraft";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { RichTextEditor } from "../components/teacher/RichTextEditor";
import {
  GUIDELINES_MAX_LENGTH,
  htmlToPlainText,
  plainTextToHtml,
} from "../lib/guidelinesText";
import { Button } from "../components/ui/Button";
import { PageLoading } from "../components/ui/PageLoading";
import { Tabs } from "../components/ui/Tabs";
import { TextInput } from "../components/ui/TextInput";
import { evaluationCriteria } from "../data/landing";
import "../components/teacher/teacher.css";
import { avatarColor } from "../lib/avatarColor";
import { createFolder } from "../lib/evaluationFolders";
import { getAssessment, updateAssessment } from "../api/assessments";
import { Toast } from "../components/teacher/Toast";

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

// 닉네임 첫 글자를 색이 있는 동그라미에 보여 줍니다(채점 화면의 학생 아바타와 같은 방식).
export function ParticipantAvatar({ name }: { name: string }) {
  return (
    <span
      className="teacher-lobby-avatar"
      style={{ background: avatarColor(name) }}
      aria-hidden="true"
    >
      {name.trim().charAt(0)}
    </span>
  );
}

export function EmptyParticipantsIcon() {
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

export function TeacherEvaluationPage({ folderMode = false }: { folderMode?: boolean }) {
  const { evaluationId, folderId } = useParams();
  const editFolderId = folderMode ? folderId : undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [evaluationGuidelines, setEvaluationGuidelines] = useState("");
  const [expiresHours, setExpiresHours] = useState("1");
  const [expiresMinutes, setExpiresMinutes] = useState("0");
  const [expiresError, setExpiresError] = useState("");
  const [guidelinesError, setGuidelinesError] = useState("");
  const [revision, setRevision] = useState<number | undefined>(undefined);
  const [questionErrorKey, setQuestionErrorKey] = useState<string | null>(null);
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
  const [createStep, setCreateStep] = useState<
    "details" | "settings" | "questions"
  >("details");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(evaluationId || editFolderId));

  const refreshLobby = useCallback(async () => {
    if (!evaluationId) return;
    const next = await getParticipants(evaluationId);
    setLobby(next);
  }, [evaluationId]);

  useEffect(() => {
    if (!editFolderId) return;
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const assessment = await getAssessment(editFolderId);
        if (!active) return;
        setRevision(assessment.revision);
        setTitle(assessment.title);
        setEvaluationGuidelines(
          /<[a-z][\s\S]*>/i.test(assessment.guidelines ?? "")
            ? assessment.guidelines
            : plainTextToHtml(assessment.guidelines ?? ""),
        );
        setAiPolicy(assessment.aiPolicy);
        setCriteria(assessment.criteria);
        setAntiCheat(assessment.antiCheat as AntiCheatOption[]);
        setQuestions(
          assessment.questions.length
            ? assessment.questions.map(toDraftQuestion)
            : [freshQuestion(1)],
        );
      } catch (error) {
        if (active) {
          setNotice(apiErrorMessage(error, "수행평가를 불러오지 못했습니다."));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [editFolderId]);

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
          plainTextToHtml(nextConfiguration.guidelines ?? ""),
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
    onChange: (key: string, content: string) => {
      if (key === questionErrorKey) setQuestionErrorKey(null);
      setQuestions((current) =>
        current.map((question) =>
          question.key === key ? { ...question, content } : question,
        ),
      );
    },
    onLimitChange: (
      key: string,
      field: "minChars" | "maxChars",
      value: string,
    ) =>
      setQuestions((current) =>
        current.map((question) =>
          question.key === key ? { ...question, [field]: value } : question,
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
      setNotice("1분 ~ 24시간 사이로 입력해주세요. (분은 0~59)");
      return false;
    }
    setExpiresError("");
    return true;
  }

  function continueToSettings() {
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!title.trim() || title.trim().length > 100) {
      setTitleError("평가 제목을 공백 없이 100자 이내로 입력해주세요.");
      setNotice("평가 제목을 공백 없이 100자 이내로 입력해주세요.");
      return;
    }
    setTitleError("");
    setGuidelinesError("");
    if (!folderMode && !validateExpiry()) return;
    if (!htmlToPlainText(evaluationGuidelines).trim()) {
      setGuidelinesError("평가 내용을 입력해주세요.");
      setNotice("평가 내용을 입력해주세요.");
      return;
    }
    setCreateStep("settings");
  }

  function continueToQuestions() {
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!aiPolicy) {
      setNotice("AI 사용 정책을 선택해주세요.");
      return;
    }
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
      setNotice("평가 제목을 공백 없이 100자 이내로 입력해주세요.");
      return;
    }
    setTitleError("");
    if (!aiPolicy) {
      setNotice("AI 사용 정책을 선택해주세요.");
      setCreateStep("settings");
      return;
    }
    if (!criteria.length) {
      setNotice("평가 항목을 1개 이상 선택해주세요.");
      setCreateStep("settings");
      return;
    }
    if (!folderMode && !validateExpiry()) {
      setCreateStep("details");
      return;
    }
    if (!htmlToPlainText(evaluationGuidelines).trim()) {
      setGuidelinesError("평가 내용을 입력해주세요.");
      setNotice("평가 내용을 입력해주세요.");
      setCreateStep("details");
      return;
    }
    if (
      questions.length < 1 ||
      questions.length > 100 ||
      questions.some((question) => !question.content.trim())
    ) {
      const empty = questions.find((question) => !question.content.trim());
      if (empty && questions.length <= 100) {
        setQuestionErrorKey(empty.key);
        setCreateStep("questions");
        window.setTimeout(() => {
          const area = document.querySelector<HTMLTextAreaElement>(
            `[data-question-key="${empty.key}"] textarea`,
          );
          area?.focus();
          area?.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 0);
        return;
      }
      setNotice("문항은 1~100개이며, 모든 문항의 내용을 입력해야 합니다.");
      return;
    }
    setQuestionErrorKey(null);
    const limitError = questionLimitError(questions);
    if (limitError) {
      setNotice(limitError);
      return;
    }
    if (folderMode) {
      if (htmlToPlainText(evaluationGuidelines).length > GUIDELINES_MAX_LENGTH) {
        setNotice(
          `평가 안내는 ${GUIDELINES_MAX_LENGTH.toLocaleString()}자까지 입력할 수 있어요.`,
        );
        setCreateStep("details");
        return;
      }
      setBusy(true);
      try {
        const payload = {
          title: title.trim(),
          guidelines: evaluationGuidelines,
          aiPolicy: aiPolicy as AiPolicy,
          questions: questions.map(toQuestionInput),
          criteria,
          antiCheat,
        };
        if (editFolderId) {
          await updateAssessment(editFolderId, { ...payload, revision });
          navigate(`/teacher/folders/${encodeURIComponent(editFolderId)}`, {
            replace: true,
            state: { notice: "수행평가를 수정했어요. 아직 시작하지 않은 반부터 적용돼요." },
          });
        } else {
          const folder = await createFolder(payload);
          navigate(`/teacher/folders/${folder.id}`, { replace: true });
        }
      } catch (error) {
        if (editFolderId && error instanceof ApiError && error.code === "ASSESSMENT_REVISION_CONFLICT") {
          setNotice("다른 선생님이 먼저 수정했어요. 최신 내용을 불러왔으니 확인하고 다시 저장해주세요.");
          try {
            const latest = await getAssessment(editFolderId);
            setRevision(latest.revision);
            setTitle(latest.title);
            setEvaluationGuidelines(
              /<[a-z][\s\S]*>/i.test(latest.guidelines ?? "")
                ? latest.guidelines
                : plainTextToHtml(latest.guidelines ?? ""),
            );
            setAiPolicy(latest.aiPolicy);
            setCriteria(latest.criteria);
            setAntiCheat(latest.antiCheat as AntiCheatOption[]);
            setQuestions(
              latest.questions.length ? latest.questions.map(toDraftQuestion) : [freshQuestion(1)],
            );
          } catch {
            /* 최신 내용을 못 불러와도 안내만 유지합니다. */
          }
          return;
        }
        setNotice(
          apiErrorMessage(
            error,
            editFolderId ? "수행평가를 수정하지 못했습니다." : "수행평가를 만들지 못했습니다.",
          ),
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      const guidelines = htmlToPlainText(evaluationGuidelines);
      if (guidelines.length > GUIDELINES_MAX_LENGTH) {
        setNotice(
          `평가 안내는 ${GUIDELINES_MAX_LENGTH.toLocaleString()}자까지 입력할 수 있어요.`,
        );
        setCreateStep("details");
        return;
      }
      const created = await createEvaluation({
        title: title.trim(),
        expiresInMinutes,
        ...(guidelines ? { guidelines } : {}),
      });
      // 부정행위 설정·평가 항목은 아직 API 필드가 없어 평가 기준 메모처럼 이 기기에만 저장합니다.
      localStorage.setItem(
        `lit:evaluation-settings:${created.id}`,
        JSON.stringify({ antiCheat, criteria }),
      );
      const config = { aiPolicy, questions: questions.map(toQuestionInput) };
      try {
        await configureEvaluation(created.id, config);
        navigate("/teacher/evaluations", {
          replace: true,
          state: {
            notice: `‘${title.trim()}’ 평가를 만들었습니다. 원할 때 시작할 수 있어요.`,
          },
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
      if (action === "start") navigate(`/teacher/grading/${encodeURIComponent(evaluationId)}`);
    } catch (error) {
      setNotice(apiErrorMessage(error, "평가 상태를 변경하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoading layout={editFolderId ? "assessment-edit" : "lobby"} />;

  return (
    <main className="teacher-page">
      <TeacherHeader>
        {evaluationId &&
          (evaluation?.state === "STARTED" ? (
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
        ))}
      </TeacherHeader>

      <div
        className={`teacher-page-content${evaluationId ? "" : " teacher-page-content--create"}`}
      >
        {folderMode && (
          <Link
            className="folder-back"
            to={editFolderId ? `/teacher/folders/${encodeURIComponent(editFolderId)}` : "/teacher/folders"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          {editFolderId ? "수행평가로" : "내 수행평가"}
          </Link>
        )}
        <h1>{evaluation ? evaluation.title : editFolderId ? "수행평가 수정" : "수행평가 만들기"}</h1>
        <Toast message={notice} onClose={() => setNotice("")} />

        {!evaluationId ? (
          <form
            className="teacher-create-card"
            onSubmit={(event) => {
              if (editFolderId) {
                void submitCreate(event);
                return;
              }
              if (createStep === "details") {
                event.preventDefault();
                continueToSettings();
                return;
              }
              if (createStep === "settings") {
                event.preventDefault();
                continueToQuestions();
                return;
              }
              void submitCreate(event);
            }}
          >
            {editFolderId ? (
              <div className="teacher-edit-tabs">
                <Tabs
                  label="수행평가 수정 단계"
                  variant="segment"
                  value={createStep}
                  items={[
                    { value: "details", label: "평가 정보" },
                    { value: "settings", label: "평가 설정" },
                    { value: "questions", label: "문항 작성" },
                  ]}
                  onChange={(next) => {
                    setNotice("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setCreateStep(next);
                  }}
                />
              </div>
            ) : (
            <div className="teacher-create-stepper" aria-label="평가 생성 단계">
              {(
                [
                  ["details", "평가 정보"],
                  ["settings", "평가 설정"],
                  ["questions", "문항 작성"],
                ] as const
              ).map(([id, label], index, all) => {
                const currentIndex = all.findIndex(
                  ([stepId]) => stepId === createStep,
                );
                return (
                  <span
                    key={id}
                    className={
                      index === currentIndex
                        ? "is-current"
                        : index < currentIndex
                          ? "is-complete"
                          : ""
                    }
                    aria-current={index === currentIndex ? "step" : undefined}
                  >
                    <span className="teacher-step-number">{index + 1}</span>
                    <span>{label}</span>
                  </span>
                );
              })}
            </div>
            )}
            {createStep === "details" ? (
              <>
                <section className="teacher-card teacher-create-section">
                  <header className="teacher-create-section-head">
                    <h2>
                      <span className="teacher-section-num">1</span>기본 정보
                    </h2>
                  </header>
                  <div className="teacher-form-grid">
                    <TextInput
                      label={"수행평가 제목"}
                      maxLength={100}
                      required
                      value={title}
                      error={titleError}
                      disabled={busy}
                      placeholder="예) 2학기 국어 수행평가"
                      onChange={(event) => {
                        const value = event.target.value;
                        setTitle(value);
                        if (value.trim() && value.trim().length <= 100)
                          setTitleError("");
                      }}
                    />
                    {!folderMode && (
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
                    )}
                  </div>
                  {!folderMode && expiresError && (
                    <p className="input-error teacher-expiry-error">
                      {expiresError}
                    </p>
                  )}
                </section>
                <section className="teacher-card teacher-create-section">
                  <header className="teacher-create-section-head">
                    <h2>
                      <span className="teacher-section-num">2</span>평가 내용
                    </h2>
                  </header>
                  <RichTextEditor
                    label="평가 내용"
                    value={evaluationGuidelines}
                    disabled={busy}
                    invalid={!!guidelinesError}
                    placeholder="평가 기준이나 규칙을 적어 주세요."
                    onChange={(html) => {
                      setEvaluationGuidelines(html);
                      if (htmlToPlainText(html).trim()) setGuidelinesError("");
                    }}
                  />
                  {guidelinesError && (
                    <p className="input-error">{guidelinesError}</p>
                  )}
                  <p className="teacher-section-hint">
                    학생 화면에도 서식이 적용되어 보여요. 최대 10,000자까지 입력할 수 있어요.
                  </p>
                </section>
                {!editFolderId && (
                <div className="teacher-form-actions teacher-form-actions--bar">
                  <div>
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={continueToSettings}
                    >
                      다음
                    </Button>
                  </div>
                </div>
                )}
              </>
            ) : createStep === "settings" ? (
              <>
                <section className="teacher-card teacher-create-section">
                  <header className="teacher-create-section-head">
                    <h2>
                      <span className="teacher-section-num">3</span>AI 사용 정책
                    </h2>
                  </header>
                  <fieldset className="teacher-policy-options" disabled={busy}>
                    <legend className="sr-only">AI 사용 정책</legend>
                    {(
                      [
                        ["DISABLED", "사용 안 함", "학생이 AI에게 질문할 수 없어요."],
                        ["HINT_ONLY", "힌트만 허용", "답을 알려주지 않고 생각을 이끄는 힌트만 줘요."],
                        ["FULL", "전체 응답 허용", "질문 제한 없이 AI를 활용할 수 있어요."],
                      ] as const
                    ).map(([id, name, description]) => (
                      <label key={id} className="teacher-option-card">
                        <input
                          type="radio"
                          name="ai-policy"
                          value={id}
                          checked={aiPolicy === id}
                          onChange={() => setAiPolicy(id)}
                        />
                        <span>
                          <strong>{name}</strong>
                          <small>{description}</small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                </section>
                <section className="teacher-card teacher-create-section">
                  <header className="teacher-create-section-head">
                    <h2>
                      <span className="teacher-section-num">4</span>평가 항목
                      <small>
                        {evaluationCriteria.length}개 중 {criteria.length}개 선택
                      </small>
                    </h2>
                    <button
                      type="button"
                      className="teacher-section-link"
                      disabled={busy}
                      onClick={() =>
                        setCriteria(
                          criteria.length === evaluationCriteria.length
                            ? []
                            : evaluationCriteria.map((item) => item.title),
                        )
                      }
                    >
                      {criteria.length === evaluationCriteria.length
                        ? "전체 해제"
                        : "전체 선택"}
                    </button>
                  </header>
                  <fieldset className="teacher-check-group" disabled={busy}>
                    <legend className="sr-only">평가 항목</legend>
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
                </section>
                <section className="teacher-card teacher-create-section">
                  <header className="teacher-create-section-head">
                    <h2>
                      <span className="teacher-section-num">5</span>부정행위 방지
                    </h2>
                  </header>
                  <fieldset className="teacher-check-group" disabled={busy}>
                    <legend className="sr-only">부정행위 방지</legend>
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
                </section>
                {!editFolderId && (
                <div className="teacher-form-actions teacher-form-actions--bar teacher-form-actions--split">
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
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={continueToQuestions}
                  >
                    다음
                  </Button>
                </div>
                )}
              </>
            ) : (
              <div className="teacher-create-questions-step">
                <QuestionFields
                  questions={questions}
                  disabled={busy}
                  errorKey={questionErrorKey}
                  errorMessage="문항 내용을 입력해주세요."
                  {...questionHandlers}
                />
                {!editFolderId && (
                <div className="teacher-form-actions teacher-form-actions--bar teacher-form-actions--split">
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setNotice("");
                      setCreateStep("settings");
                    }}
                  >
                    이전
                  </Button>
                  <Button type="submit" loading={busy}>
                    {editFolderId
                      ? busy ? "저장 중…" : "저장"
                      : busy ? "생성 중…" : folderMode ? "수행평가 만들기" : "평가 생성"}
                  </Button>
                </div>
                )}
              </div>
            )}
            {editFolderId && (
              <div className="teacher-form-actions teacher-form-actions--bar teacher-edit-save">
                <div>
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      navigate(`/teacher/folders/${encodeURIComponent(editFolderId)}`)
                    }
                  >
                    취소
                  </Button>
                  <Button type="submit" loading={busy}>
                    {busy ? "저장 중…" : "저장"}
                  </Button>
                </div>
              </div>
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
                      <ParticipantAvatar name={participant.nickname} />
                      <span>{participant.nickname}</span>
                      {participant.presence !== "CONNECTED" && (
                        <small>연결 끊김</small>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  size="panel"
                  icon="users"
                  title="참여자를 기다리고 있어요"
                  description={
                    evaluation.state === "WAITING"
                      ? "연결된 학생이 1명 이상이어야 평가를 시작할 수 있어요."
                      : undefined
                  }
                />
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
          actions={<Button onClick={() => setQrOpen(false)}>확인</Button>}
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
