import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiErrorMessage } from "../api/client";
import {
  endEvaluation,
  extendEvaluation,
  getEvaluation,
  getGradingActivity,
  getGradingAnswers,
  getGradingConversations,
  getGradingReportPdf,
  getGradingReview,
  getGradingStudents,
  saveCriterionScore,
} from "../api/evaluations";
import type {
  GradingActivity,
  GradingAnswers,
  GradingMessage,
  GradingReview,
  GradingStudent,
} from "../api/types";
import type { Question, Student, StudentStatus } from "../data/grading";
import type { Assessment, StudentReview } from "../data/review";
import { htmlToPlainText } from "../lib/guidelinesText";

const POLL_MS = 10000;
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
): StudentReview {
  return {
    studentContribution: activity?.studentContribution ?? null,
    usage: (activity?.usage ?? []).map((item, index) => ({
      label: item.name,
      percent: Math.round(item.percentage),
      level: item.level,
      color: item.colorKey === "neutral" ? "#b6bdc7" : USAGE_COLORS[index % USAGE_COLORS.length],
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
    status: STATUS[base.status] ?? "작성중",
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
  } | null>(null);
  const [loadingList, setLoadingList] = useState(Boolean(evaluationId));
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [ended, setEnded] = useState(false);
  const selectedRef = useRef("");
  selectedRef.current = selectedId;
  // 새로 제출했거나 경고가 생긴 학생을 알려 주는 토스트 대기열입니다.
  const [events, setEvents] = useState<
    { key: string; message: string; tone: "info" | "error" }[]
  >([]);
  const seenRef = useRef<Map<string, { submitted: boolean; warning: boolean }> | null>(null);

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
  }, [evaluationId]);

  const loadDetail = useCallback(
    async (participantId: string, silent = false) => {
      if (!evaluationId || !participantId) return;
      if (!silent) setLoadingDetail(true);
      try {
        const [answers, messages, activity, review] = await Promise.all([
          getGradingAnswers(evaluationId, participantId),
          getGradingConversations(evaluationId, participantId),
          getGradingActivity(evaluationId, participantId),
          getGradingReview(evaluationId, participantId),
        ]);
        if (selectedRef.current !== participantId) return;
        setDetail({ id: participantId, answers, messages, activity, review });
        setError("");
      } catch (e) {
        setError(apiErrorMessage(e, "학생 자료를 불러오지 못했습니다."));
      } finally {
        if (!silent) setLoadingDetail(false);
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
    const timer = window.setInterval(() => void loadList(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [evaluationId, loadList]);

  useEffect(() => {
    if (!selectedId) return;
    setDetail((current) => (current?.id === selectedId ? current : null));
    void loadDetail(selectedId);
    // 작성 중인 학생은 답안·대화가 바뀌므로 주기적으로 갱신합니다.
    const timer = window.setInterval(() => void loadDetail(selectedId, true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [selectedId, loadDetail]);

  const current = detail?.id === selectedId ? detail : null;
  const students = list.map((item) =>
    toStudent(
      item,
      item.participantId === selectedId && current
        ? { answers: current.answers, messages: current.messages }
        : undefined,
    ),
  );
  const questions: Question[] = (current?.answers.questions ?? []).map((q) => ({
    id: q.position,
    title: q.title || `문항 ${q.position}`,
    content: q.content,
  }));
  const review = toReview(current?.review ?? null, current?.activity ?? null);

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
          void loadDetail(selectedId, true);
        } else if (e instanceof ApiError && e.code === "SUBMISSION_REQUIRED") {
          setError("제출한 학생만 채점할 수 있어요.");
        } else {
          setError(apiErrorMessage(e, "점수를 저장하지 못했습니다."));
        }
      }
    },
    [evaluationId, selectedId, current, loadDetail],
  );

  const finishEvaluation = useCallback(async () => {
    if (!evaluationId) return;
    try {
      await endEvaluation(evaluationId);
      setEnded(true);
      void loadList();
      if (selectedRef.current) void loadDetail(selectedRef.current, true);
    } catch (e) {
      setError(apiErrorMessage(e, "평가를 종료하지 못했습니다."));
    }
  }, [evaluationId, loadList, loadDetail]);

  const extendTime = useCallback(
    async (minutes: number) => {
      if (!evaluationId) return;
      await extendEvaluation(evaluationId, minutes);
    },
    [evaluationId],
  );

  const downloadReport = useCallback(async () => {
    if (!evaluationId || !selectedId) return;
    try {
      const blob = await getGradingReportPdf(evaluationId, selectedId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const name = list.find((s) => s.participantId === selectedId)?.nickname ?? "학생";
      link.href = url;
      link.download = `${name} 학습 보고서.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "SUBMISSION_REQUIRED"
          ? "제출 후에 PDF를 저장할 수 있어요."
          : apiErrorMessage(e, "PDF를 저장하지 못했습니다."),
      );
    }
  }, [evaluationId, selectedId, list]);

  return {
    students,
    counts,
    questions,
    review: current ? review : emptyReview,
    selectedId,
    select: setSelectedId,
    loading: loadingList || (loadingDetail && !current),
    error,
    clearError: () => setError(""),
    events,
    dismissEvent: (key: string) =>
      setEvents((queue) => queue.filter((event) => event.key !== key)),
    ended,
    setScore,
    finishEvaluation,
    extendTime,
    downloadReport,
  };
}
