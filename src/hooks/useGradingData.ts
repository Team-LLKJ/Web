import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiErrorMessage } from "../api/client";
import {
  confirmGrade,
  createGradingReport,
  endEvaluation,
  extendEvaluation,
  getEvaluation,
  getGradingActivity,
  getGradingAnswers,
  getGradingConversations,
  getGradingReportHwp,
  getGradingReportPdf,
  getGradingReview,
  getGradingStudents,
  getParticipants,
  getAssessmentAnalysis,
  getRubricScores,
  saveCriterionScore,
  saveRubricScore,
  streamLiveEvents,
} from "../api/evaluations";
import type {
  AssessmentAnalysis,
  GradingActivity,
  GradingAnswers,
  GradingMessage,
  GradingReview,
  GradingStudent,
  RubricScores,
} from "../api/types";
import type { Question, Student, StudentStatus } from "../data/grading";
import { addedMinutes, toEndInfo, type EndInfo } from "../lib/remainingTime";
import type { Assessment, StudentReview } from "../data/review";
import { htmlToPlainText } from "../lib/guidelinesText";

const POLL_MS = 2000;
const AVATAR_COLORS = ["#ffd4d3", "#d6e9ff", "#d9f2dc", "#fff0c2", "#e5dcff", "#ffe0f0"];
const USAGE_COLORS = ["#0059bc", "#007bff", "#52a6ff", "#9bc9ff"];

const STATUS: Record<string, StudentStatus> = {
  SUBMITTED: "제출완료",
  WARNING: "경고",
  WRITING: "작성중",
};

function colorFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const pad = (n: number) => String(n).padStart(2, "0");
function dateLabel(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}`;
}
function timeLabel(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toAssessment(item: GradingReview["criteria"][number]): Assessment {
  return {
    id: item.id,
    criterion: item.criterion,
    score: item.score,
    maxScore: item.maxScore,
    feedback: item.feedback,
    evidence: item.evidence,
  };
}

function toReview(
  review: GradingReview | null,
  activity: GradingActivity | null,
  rubric: RubricScores | null = null,
  analysis: AssessmentAnalysis | null = null,
): StudentReview {
  // 활동 카드의 기여도는 항상 null이라, AI 활용 분석의 문장 유사도 추정값을 대신 씁니다.
  const estimated = analysis?.contribution?.direct ?? null;
  return {
    rubric,
    studentContribution: estimated ?? activity?.studentContribution ?? null,
    contributionEstimated: estimated !== null,
    analysisDetail: analysis,
    // 서버가 회색(neutral)으로 내려주는 '미분류' 항목은 화면에서 숨깁니다.
    usage: (activity?.usage ?? [])
      .filter((item) => item.colorKey !== "neutral" && item.name !== "미분류")
      .map((item, index) => ({
      label: item.name,
      percent: Math.round(item.percentage),
      level: item.level,
      color: USAGE_COLORS[index % USAGE_COLORS.length],
    })),
    warnings: (activity?.warnings ?? []).map((item) => ({
      id: String(item.eventId),
      label: item.type === "SHORTCUT_CAPTURE" ? "캡처 단축키 감지" : "창 이탈",
      time: timeLabel(item.occurredAt),
      type: item.type === "SHORTCUT_CAPTURE" ? "command" : "window",
    })),
    summary: activity?.summary ?? "",
    criteria: (review?.criteria ?? []).map(toAssessment),
    analysis: (review?.analysis ?? []).map(toAssessment),
  };
}

const emptyReview = toReview(null, null);

function toStudent(
  base: GradingStudent,
  detail?: {
    answers: GradingAnswers;
    messages: GradingMessage[];
  },
): Student {
  const positions = new Map(
    (detail?.answers.questions ?? []).map((q) => [q.questionId, q.position]),
  );
  return {
    id: base.participantId,
    name: base.nickname,
    color: colorFor(base.participantId),
    // 평가 종료로 자동 제출된 학생은 status가 WRITING으로 남아도 submissionStatus로 제출 여부를 판단합니다.
    status:
      base.submissionStatus === "SUBMITTED" || base.submittedAt
        ? "제출완료"
        : (STATUS[base.status] ?? "작성중"),
    submittedAt: dateLabel(base.submittedAt),
    answers: (detail?.answers.questions ?? []).map((q) => ({
      questionId: q.position,
      html: q.answer?.content ?? "",
      paragraphs: htmlToPlainText(q.answer?.content ?? "")
        .split("\n")
        .filter((line) => line.trim()),
    })),
    messages: (detail?.messages ?? [])
      .filter((m) => positions.has(m.questionId) || positions.size === 0)
      .map((m) => ({
        id: m.id,
        role: m.role === "USER" ? ("user" as const) : ("ai" as const),
        content:
          m.content ??
          (m.status === "FAILED" ? "AI 응답을 받지 못했습니다." : "응답 대기 중입니다."),
        pending: m.status === "PENDING",
      })),
    activities: [],
    rubric: [],
  };
}

export function useGradingData(evaluationId: string | undefined) {
  const [list, setList] = useState<GradingStudent[]>([]);
  const [counts, setCounts] = useState({ submitted: 0, warning: 0, writing: 0 });
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<{
    id: string;
    answers: GradingAnswers;
    messages: GradingMessage[];
    activity: GradingActivity;
    review: GradingReview;
    rubric: RubricScores | null;
    analysis: AssessmentAnalysis | null;
  } | null>(null);
  const [loadingList, setLoadingList] = useState(Boolean(evaluationId));
  const [error, setError] = useState("");
  const [ended, setEnded] = useState(false);
  const selectedRef = useRef("");
  const endedRef = useRef(false);
  const [endInfo, setEndInfo] = useState<EndInfo | null>(null);
  const lastEndsAtRef = useRef<number | null>(null);
  useEffect(() => {
    endedRef.current = ended;
  }, [ended]);
  useEffect(() => {
    selectedRef.current = selectedId;
  });
  // 새로 제출했거나 경고가 생긴 학생을 알려 주는 토스트 대기열입니다.
  const [events, setEvents] = useState<
    { key: string; message: string; tone: "info" | "error" }[]
  >([]);
  const seenRef = useRef<Map<string, { submitted: boolean; warning: boolean }> | null>(null);
  // 경고 표시는 경고를 받은 직후 5초 동안만 보여줍니다.
  const [warnedIds, setWarnedIds] = useState<string[]>([]);
  const showWarningBadge = useCallback((participantId: string) => {
    setWarnedIds((ids) => (ids.includes(participantId) ? ids : [...ids, participantId]));
    window.setTimeout(
      () => setWarnedIds((ids) => ids.filter((id) => id !== participantId)),
      5000,
    );
  }, []);

  const loadList = useCallback(async () => {
    if (!evaluationId) return;
    try {
      const result = await getGradingStudents(evaluationId, { size: 100 });
      const students = result.students ?? result.items;
      const previous = seenRef.current;
      const next = new Map<string, { submitted: boolean; warning: boolean }>();
      const fresh: { key: string; message: string; tone: "info" | "error" }[] = [];
      for (const student of students) {
        const state = {
          submitted:
            student.status === "SUBMITTED" || student.submissionStatus === "SUBMITTED",
          warning: student.activityWarning || student.status === "WARNING",
        };
        next.set(student.participantId, state);
        // 첫 불러오기는 이미 있던 상태이므로 알리지 않습니다.
        if (!previous) continue;
        const before = previous.get(student.participantId);
        if (state.warning && !before?.warning) {
          showWarningBadge(student.participantId);
          fresh.push({
            key: `warn-${student.participantId}-${Date.now()}`,
            message: `${student.nickname} 학생에게서 부정행위가 감지됐어요.`,
            tone: "error",
          });
        }
        if (state.submitted && !before?.submitted) {
          fresh.push({
            key: `submit-${student.participantId}-${Date.now()}`,
            message: `${student.nickname} 학생이 답안을 제출했어요.`,
            tone: "info",
          });
        }
      }
      seenRef.current = next;
      if (fresh.length) setEvents((queue) => [...queue, ...fresh]);
      setList(students);
      setCounts(result.counts);
      setError("");
      if (!selectedRef.current && result.items[0]) {
        setSelectedId(result.items[0].participantId);
      }
    } catch (e) {
      setError(apiErrorMessage(e, "학생 목록을 불러오지 못했습니다."));
    } finally {
      setLoadingList(false);
    }
  }, [evaluationId, showWarningBadge]);

  const loadDetail = useCallback(
    async (participantId: string) => {
      if (!evaluationId || !participantId) return;
      try {
        const [answers, messages, activity, review, rubric, analysis] = await Promise.all([
          getGradingAnswers(evaluationId, participantId),
          getGradingConversations(evaluationId, participantId),
          getGradingActivity(evaluationId, participantId),
          getGradingReview(evaluationId, participantId),
          // 기준별 점수는 실패해도 기존 루브릭 화면으로 대신 보여줍니다.
          getRubricScores(evaluationId, participantId).catch(() => null),
          getAssessmentAnalysis(evaluationId, participantId).catch(() => null),
        ]);
        if (selectedRef.current !== participantId) return;
        setDetail({ id: participantId, answers, messages, activity, review, rubric, analysis });
        setError("");
      } catch (e) {
        setError(apiErrorMessage(e, "학생 자료를 불러오지 못했습니다."));
      }
    },
    [evaluationId],
  );

  useEffect(() => {
    if (!evaluationId) return;
    void loadList();
    void getEvaluation(evaluationId)
      .then((e) => setEnded(e.state === "ENDED" || e.state === "EXPIRED"))
      .catch(() => undefined);
    // 이전 요청이 끝나기 전에는 다시 요청하지 않고, 탭이 보일 때만 갱신합니다.
    let busy = false;
    const tick = () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      void loadList().finally(() => {
        busy = false;
      });
    };
    // 실시간(SSE)이 연결돼 있으면 목록 조회는 가끔만 하고, 이벤트가 오면 바로 갱신합니다.
    let liveConnected = false;
    let skipped = 0;
    const timer = window.setInterval(() => {
      if (liveConnected && ++skipped % 5 !== 0) return;
      tick();
    }, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    const controller = new AbortController();
    void (async () => {
      let lastEventId = "";
      let delay = 2000;
      while (!controller.signal.aborted && !endedRef.current) {
        try {
          await streamLiveEvents(evaluationId, {
            signal: controller.signal,
            lastEventId,
            onOpen: () => {
              liveConnected = true;
              delay = 2000;
            },
            onEvent: (event) => {
              if (event.id) lastEventId = event.id;
              tick();
              if (selectedRef.current) void loadDetail(selectedRef.current);
            },
          });
        } catch (e) {
          if (controller.signal.aborted) return;
          // 서버가 아직 지원하지 않거나 권한이 없으면 기존 주기 조회만 씁니다.
          if (e instanceof ApiError && [400, 401, 403, 404].includes(e.status)) return;
        }
        liveConnected = false;
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 30_000);
      }
    })();
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [evaluationId, loadList, loadDetail]);

  useEffect(() => {
    if (!selectedId) return;
    setDetail((current) => (current?.id === selectedId ? current : null));
    void loadDetail(selectedId);
    // 작성 중인 학생은 답안·대화가 바뀌므로 주기적으로 갱신합니다.
    // 평가가 끝나면 답안·대화가 더 바뀌지 않으므로 갱신하지 않습니다.
    let busy = false;
    const tick = () => {
      if (busy || endedRef.current || document.visibilityState !== "visible") return;
      busy = true;
      void loadDetail(selectedId).finally(() => {
        busy = false;
      });
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [selectedId, loadDetail]);

  // 남은 시간: 풀이 종료 시각을 주기적으로 받아 오고, 시간이 늘어나면 알려 줍니다.
  const refreshEnd = useCallback(
    async (silent: boolean) => {
      if (!evaluationId) return;
      try {
        const lobby = await getParticipants(evaluationId);
        if (!lobby.endsAt) return;
        const endsAt = new Date(lobby.endsAt).getTime();
        const added = addedMinutes(lastEndsAtRef.current, endsAt);
        if (added > 0 && !silent) {
          setEvents((queue) => [
            ...queue,
            { key: `time-${endsAt}`, message: `평가 시간이 ${added}분 추가되었어요.`, tone: "info" },
          ]);
        }
        lastEndsAtRef.current = endsAt;
        setEndInfo(toEndInfo(lobby.endsAt, lobby.serverNow));
      } catch {
        /* 다음 주기에 다시 받아 옵니다. */
      }
    },
    [evaluationId],
  );
  useEffect(() => {
    if (!evaluationId) return;
    void refreshEnd(true);
    const timer = window.setInterval(() => {
      if (!endedRef.current && document.visibilityState === "visible") void refreshEnd(false);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [evaluationId, refreshEnd]);

  const current = detail?.id === selectedId ? detail : null;
  const students = list.map((item) => {
    const student = toStudent(
      item,
      item.participantId === selectedId && current
        ? { answers: current.answers, messages: current.messages }
        : undefined,
    );
    // 경고 표시는 받은 직후 5초만 보여주고, 그 뒤에는 작성 중으로 되돌립니다.
    if (student.status === "경고" && !warnedIds.includes(item.participantId)) {
      return { ...student, status: "작성중" as const };
    }
    return student;
  });
  const questions: Question[] = (current?.answers.questions ?? []).map((q) => ({
    id: q.position,
    title: q.title || `문항 ${q.position}`,
    content: q.content,
    minChars: q.minChars,
    maxChars: q.maxChars,
  }));
  const review = toReview(
    current?.review ?? null,
    current?.activity ?? null,
    current?.rubric ?? null,
    current?.analysis ?? null,
  );

  // 허용 범위 판단처럼 루브릭 응답을 통째로 돌려주는 동작 뒤에 화면 값을 바꿉니다.
  const replaceRubric = useCallback(
    (rubric: RubricScores) => {
      setDetail((now) => (now && now.id === selectedRef.current ? { ...now, rubric } : now));
    },
    [],
  );

  const setScore = useCallback(
    async (criterionId: string, score: number | null) => {
      if (!evaluationId || !selectedId || !current) return;
      const previous = current.review;
      setDetail({
        ...current,
        review: {
          ...previous,
          criteria: previous.criteria.map((c) => (c.id === criterionId ? { ...c, score } : c)),
        },
      });
      try {
        const saved = await saveCriterionScore(
          evaluationId,
          selectedId,
          criterionId,
          score,
          previous.version,
        );
        setDetail((now) => (now && now.id === selectedId ? { ...now, review: saved } : now));
        setError("");
      } catch (e) {
        setDetail((now) => (now && now.id === selectedId ? { ...now, review: previous } : now));
        if (e instanceof ApiError && e.code === "REVIEW_VERSION_CONFLICT") {
          setError("다른 곳에서 먼저 채점이 저장됐어요. 최신 내용을 다시 불러왔습니다.");
          void loadDetail(selectedId);
        } else if (e instanceof ApiError && e.code === "SUBMISSION_REQUIRED") {
          setError("제출한 학생만 채점할 수 있어요.");
        } else {
          setError(apiErrorMessage(e, "점수를 저장하지 못했습니다."));
        }
      }
    },
    [evaluationId, selectedId, current, loadDetail],
  );

  // 기준 하나의 교사 점수(level 0~4)를 저장합니다. null이면 그 기준의 교사 점수를 지웁니다.
  const setLevel = useCallback(
    async (criterionId: number, level: number | null) => {
      if (!evaluationId || !selectedId || !current?.rubric) return;
      const previous = current.rubric;
      setDetail({
        ...current,
        rubric: {
          ...previous,
          criteria: previous.criteria.map((c) =>
            c.criterionId === criterionId
              ? {
                  ...c,
                  teacher:
                    level === null
                      ? null
                      : {
                          level,
                          score: (c.maxScore * level) / 4,
                          feedback: c.teacher?.feedback ?? "",
                        },
                }
              : c,
          ),
        },
      });
      try {
        const saved = await saveRubricScore(
          evaluationId,
          selectedId,
          criterionId,
          level === null ? {} : { level },
        );
        setDetail((now) => (now && now.id === selectedId ? { ...now, rubric: saved } : now));
        setError("");
      } catch (e) {
        setDetail((now) => (now && now.id === selectedId ? { ...now, rubric: previous } : now));
        setError(
          e instanceof ApiError && e.code === "SUBMISSION_REQUIRED"
            ? "제출한 학생만 채점할 수 있어요."
            : apiErrorMessage(e, "점수를 저장하지 못했습니다."),
        );
      }
    },
    [evaluationId, selectedId, current],
  );

  // 교사 점수를 바꾸거나 AI가 못 한 기준을 채점한 근거(feedback)를 저장합니다.
  const setFeedback = useCallback(
    async (criterionId: number, feedback: string) => {
      if (!evaluationId || !selectedId || !current?.rubric) return;
      const target = current.rubric.criteria.find((c) => c.criterionId === criterionId);
      if (!target?.teacher) return;
      try {
        const saved = await saveRubricScore(evaluationId, selectedId, criterionId, {
          level: target.teacher.level,
          feedback,
        });
        setDetail((now) => (now && now.id === selectedId ? { ...now, rubric: saved } : now));
        setError("");
      } catch (e) {
        setError(apiErrorMessage(e, "근거를 저장하지 못했습니다."));
      }
    },
    [evaluationId, selectedId, current],
  );

  // 교사가 고르지 않은 기준은 AI 추천 점수로 확정합니다. AI도 채점하지 못한 기준이 있으면
  // 확정하지 않고 그 기준 번호를 돌려줘 직접 채점하게 합니다.
  const confirmGrading = useCallback(async (): Promise<number[]> => {
    if (!evaluationId || !selectedId) return [];
    const missing = (current?.rubric?.criteria ?? []).filter((c) => !c.teacher && !c.ai);
    if (missing.length) {
      setError(
        `AI가 채점하지 못한 기준이 있어요. ${missing.map((c) => c.name).join(", ")}만 직접 채점해주세요.`,
      );
      return missing.map((c) => c.criterionId);
    }
    try {
      const saved = await confirmGrade(evaluationId, selectedId, true);
      setDetail((now) => (now && now.id === selectedId ? { ...now, rubric: saved } : now));
      setError("");
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "GRADING_INCOMPLETE"
          ? "AI가 채점하지 못한 기준이 있어요. 해당 기준을 직접 채점해주세요."
          : e instanceof ApiError && e.code === "SUBMISSION_REQUIRED"
            ? "제출한 학생만 채점할 수 있어요."
            : apiErrorMessage(e, "채점을 확정하지 못했습니다."),
      );
    }
    return [];
  }, [evaluationId, selectedId, current]);

  /** 평가를 종료합니다. 성공하면 true, 실패하면 오류를 화면에 띄우고 false를 돌려줍니다. */
  const finishEvaluation = useCallback(async () => {
    if (!evaluationId) return false;
    try {
      await endEvaluation(evaluationId);
      setEnded(true);
      void loadList();
      if (selectedRef.current) void loadDetail(selectedRef.current);
      return true;
    } catch (e) {
      setError(apiErrorMessage(e, "평가를 종료하지 못했습니다."));
      return false;
    }
  }, [evaluationId, loadList, loadDetail]);

  const extendTime = useCallback(
    async (minutes: number) => {
      if (!evaluationId) return;
      await extendEvaluation(evaluationId, minutes);
      // 직접 연장한 경우는 화면이 이미 알려 주므로 토스트 없이 시각만 갱신합니다.
      await refreshEnd(true);
    },
    [evaluationId, refreshEnd],
  );

  // 저장 창이 오류를 보여주도록 실패하면 메시지와 함께 던집니다.
  const reportError = (e: unknown, fallback: string) =>
    new Error(
      e instanceof ApiError && e.code === "SUBMISSION_REQUIRED"
        ? "제출 후에 보고서를 저장할 수 있어요."
        : apiErrorMessage(e, fallback),
    );

  const downloadReport = useCallback(
    async (format: "pdf" | "hwp" = "pdf") => {
      if (!evaluationId || !selectedId) return;
      try {
        let blob: Blob;
        if (format === "hwp") {
          try {
            blob = await getGradingReportHwp(evaluationId, selectedId);
          } catch (e) {
            // 아직 만든 리포트가 없으면 만들고 다시 받습니다.
            if (!(e instanceof ApiError && e.status === 404)) throw e;
            await createGradingReport(evaluationId, selectedId);
            blob = await getGradingReportHwp(evaluationId, selectedId);
          }
        } else {
          blob = await getGradingReportPdf(evaluationId, selectedId);
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const name = list.find((s) => s.participantId === selectedId)?.nickname ?? "학생";
        link.href = url;
        link.download = `${name} 학습 보고서.${format}`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        throw reportError(e, "보고서를 저장하지 못했습니다.");
      }
    },
    [evaluationId, selectedId, list],
  );

  const previewReport = useCallback(async () => {
    if (!evaluationId || !selectedId) throw new Error("학생을 먼저 선택해주세요.");
    try {
      return await getGradingReportPdf(evaluationId, selectedId);
    } catch (e) {
      throw reportError(e, "미리보기를 불러오지 못했습니다.");
    }
  }, [evaluationId, selectedId]);

  return {
    students,
    counts,
    questions,
    review: current ? review : emptyReview,
    selectedId,
    select: setSelectedId,
    // 목록을 처음 불러오는 동안만 전체 로딩, 학생 전환 중에는 안쪽 내용만 로딩합니다.
    listLoading: loadingList,
    loading: loadingList || (Boolean(selectedId) && !current && !error),
    error,
    clearError: () => setError(""),
    events,
    endInfo,
    dismissEvent: (key: string) =>
      setEvents((queue) => queue.filter((event) => event.key !== key)),
    ended,
    setScore,
    setLevel,
    setFeedback,
    confirmGrading,
    replaceRubric,
    evaluationId: evaluationId ?? "",
    questionTitles: Object.fromEntries(
      (current?.answers.questions ?? []).map((q) => [q.questionId, q.title || `문항 ${q.position}`]),
    ) as Record<string, string>,
    finishEvaluation,
    extendTime,
    downloadReport,
    previewReport,
  };
}
