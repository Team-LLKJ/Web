// AI 루브릭 판정(과정 채점) 결과를 채점 화면의 기준별 점수 모양으로 바꾸고, 교사 수정·확정 요청을 만듭니다.
// 판정은 학생 한 명 단위로, 항목마다 한 칸(questionId = null)입니다. 단계는 서버 1~5, 화면 0~4입니다.
import { ApiError } from "../api/client";
import { getEvaluationConfiguration } from "../api/evaluations";
import { htmlToPlainText } from "./guidelinesText";
import {
  getProcessPolicy,
  saveProcessPolicy,
  getProcessReview,
  listProcessRuns,
  type ProcessBehaviorReason,
  type ProcessCell,
  type ProcessCriterion,
  type ProcessJob,
  type ProcessOverride,
  type ProcessReview,
} from "../api/evaluations";
import type { RubricScoreCriterion, RubricScores } from "../api/types";

export type ProcessState = { job: ProcessJob; review: ProcessReview | null };

const ORDER: ProcessCriterion[] = [
  "PURPOSE",
  "SELF_DIRECTION",
  "CRITICAL_REVIEW",
  "CONTRIBUTION",
  "TRANSPARENCY",
];
const NAMES: Record<ProcessCriterion, string> = {
  PURPOSE: "AI 활용 목적의 적절성",
  SELF_DIRECTION: "자기 주도적 사고",
  CRITICAL_REVIEW: "AI 답변의 비판적 검토",
  CONTRIBUTION: "최종 답안에 대한 학생의 기여",
  TRANSPARENCY: "AI 활용 과정의 투명성",
};
const MAX: Record<ProcessCriterion, number> = {
  PURPOSE: 15,
  SELF_DIRECTION: 25,
  CRITICAL_REVIEW: 20,
  CONTRIBUTION: 25,
  TRANSPARENCY: 15,
};
/** 교사가 근거를 적지 않았을 때 보내는 사유(서버가 빈 사유를 받지 않습니다). */
export const DEFAULT_OVERRIDE_REASON = "교사 직접 판정";
const CONFIRM_REASON = "교사가 루브릭 채점을 확인함";

export const criterionIdOf = (criterion: ProcessCriterion) => ORDER.indexOf(criterion) + 1;
const criterionOf = (criterionId: number) => ORDER[criterionId - 1];

const studentCells = (cells: ProcessCell[] | undefined) =>
  (cells ?? []).filter((cell) => cell.questionId === null || cell.questionId === undefined);

/** 가장 최근에 끝난 AI 루브릭 판정과 교사 검토를 불러옵니다. 판정이 없으면 null입니다. */
export async function loadProcessRubric(
  evaluationId: string,
  participantId: string,
): Promise<ProcessState | null> {
  const jobs = await listProcessRuns(evaluationId, participantId);
  const job = jobs
    .filter(
      (item) =>
        item.result &&
        (item.status === "DONE" || item.status === "HOLD") &&
        studentCells(item.result.cells).length > 0,
    )
    .sort((a, b) => b.version - a.version)[0];
  if (!job) return null;
  let review: ProcessReview | null = null;
  try {
    review = await getProcessReview(evaluationId, participantId, job.id);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404)) throw e;
  }
  return { job, review };
}

const reasonOf = (reason: ProcessBehaviorReason) => ({
  title: reason.title,
  explanation: reason.explanation,
  quotes: (reason.evidence ?? [])
    .filter((e) => e.quote)
    .map((e) => ({ text: e.quote ?? "", conversationId: e.location?.conversationId ?? null })),
});

const toScreenLevel = (value: number | "NA" | "HOLD" | null | undefined) =>
  typeof value === "number" ? value - 1 : (value ?? null);

export function toRubricScores(state: ProcessState): RubricScores {
  const aiCells = studentCells(state.job.result?.cells);
  const current = state.review?.result ?? state.job.result;
  const nowCells = studentCells(current?.cells);
  const overrides = (state.review?.overrides ?? []).filter((o) => o.questionId === null);
  const confirmed = Boolean(state.review?.confirmed);
  const criteria: RubricScoreCriterion[] = ORDER.filter((criterion) =>
    aiCells.some((cell) => cell.criterion === criterion),
  ).map((criterion) => {
    const ai = aiCells.find((cell) => cell.criterion === criterion)!;
    const now = nowCells.find((cell) => cell.criterion === criterion) ?? ai;
    const override = overrides.find((o) => o.criterion === criterion);
    const notApplicable = now.status === "NOT_APPLICABLE";
    const maxScore = notApplicable ? MAX[criterion] : (now.adjustedMaxScore ?? MAX[criterion]);
    const aiLevel = ai.level ?? null;
    return {
      criterionId: criterionIdOf(criterion),
      name: now.criterionName ?? NAMES[criterion],
      maxScore,
      indicator: criterion,
      ai:
        aiLevel === null
          ? null
          : { level: aiLevel - 1, score: Number(ai.score ?? 0), reason: ai.reason ?? "", evidence: [] },
      teacher:
        override && typeof override.level === "number"
          ? {
              level: override.level - 1,
              score: Number(now.score ?? 0),
              feedback: override.reason === DEFAULT_OVERRIDE_REASON ? "" : override.reason,
            }
          : null,
      adjusted: Boolean(override),
      status: now.status,
      currentScore: now.score === null || now.score === undefined ? null : Number(now.score),
      reviewReason: ai.judge?.reviewReason ?? null,
      needsReview: Boolean(ai.judge?.needsReview) && !override,
      votes: ai.judge?.votes?.map(toScreenLevel),
      haikuLevel: toScreenLevel(ai.judge?.haikuLevel),
      unmetNextLevel: ai.unmetNextLevel ?? null,
      reasons: [
        ...(ai.details?.credits ?? []).map((r) => ({ kind: "가점" as const, ...reasonOf(r) })),
        ...(ai.details?.deductions ?? []).map((r) => ({ kind: "감점" as const, ...reasonOf(r) })),
      ],
    };
  });
  const partial = current?.partialScore ?? null;
  const total = current?.total ?? null;
  return {
    criteria,
    totalAi: state.job.result?.total ?? null,
    totalTeacher: null,
    totalCurrent: total !== null ? Number(total) : partial ? Number(partial.assessedScore) : null,
    status: confirmed ? "CONFIRMED" : "DRAFT",
    confirmedTotal: confirmed && total !== null ? Number(total) : null,
    confirmedAt: confirmed ? (state.review?.reviewedAt ?? null) : null,
    recommendedMaxScore: null,
    missingAiCriteria: [],
    process: true,
    heldMaxScore: partial ? Number(partial.heldMaxScore) : 0,
    notApplicableMaxScore: partial ? Number(partial.notApplicableMaxScore) : 0,
  };
}

/** 교사가 아직 채점하지 않았는데 AI도 단계를 정하지 못한(보류·직접 입력 필요) 항목 번호. */
export function missingCriteria(scores: RubricScores) {
  return scores.criteria
    .filter(
      (c) => c.status !== "NOT_APPLICABLE" && !c.teacher && (c.currentScore === null || c.currentScore === undefined),
    )
    .map((c) => c.criterionId);
}

/** 기존 교사 검토에 한 항목의 변경을 더한 검토 요청 본문. level은 화면 단계(0~4), null이면 교사 수정을 지웁니다. */
export function reviewBody(
  state: ProcessState,
  change: { criterionId: number; level?: number | null; reason?: string },
  complianceOk = false,
) {
  const criterion = criterionOf(change.criterionId);
  const previous = state.review?.overrides ?? [];
  const others = previous.filter((o) => !(o.questionId === null && o.criterion === criterion));
  const existing = previous.find((o) => o.questionId === null && o.criterion === criterion);
  const level =
    change.level === undefined
      ? typeof existing?.level === "number"
        ? existing.level
        : null
      : change.level === null
        ? null
        : change.level + 1;
  const reason = change.reason?.trim() || existing?.reason || DEFAULT_OVERRIDE_REASON;
  const overrides: ProcessOverride[] =
    level === null ? others : [...others, { questionId: null, criterion, level, reason }];
  return withCompliance(state, overrides, complianceOk);
}

/** 확정 전에 저장할 검토 본문(교사 수정은 그대로, 규정 준수는 확인 완료로). */
export function confirmBody(state: ProcessState) {
  return withCompliance(state, state.review?.overrides ?? [], true);
}

function withCompliance(state: ProcessState, overrides: ProcessOverride[], complianceOk: boolean) {
  const keep = state.review && state.review.complianceDecision !== "HOLD" ? state.review : null;
  return {
    expectedRevision: state.review?.revision ?? 0,
    overrides,
    complianceDecision: keep?.complianceDecision ?? (complianceOk ? "CONFIRMED_OK" : "HOLD"),
    complianceReason:
      keep?.complianceReason || (complianceOk ? CONFIRM_REASON : state.job.result?.compliance?.reason || "교사 검토 중"),
  } as const;
}


const ALLOWED_RULES: Record<string, string> = {
  HINT_ONLY:
    "개념 설명과 풀이 방향에 대한 힌트는 허용합니다. 완성된 답안을 대신 작성하게 하거나 AI 답변을 그대로 제출하는 것은 허용하지 않습니다.",
};

/**
 * AI 루브릭 판정에 필요한 사전 정책(평가 목표·허용 규칙·문항 비율)이 없으면 평가 내용으로 만들어 저장합니다.
 * 서버는 시작 전(WAITING)에만 정책을 받고, 정책이 없으면 모든 루브릭 판정을 보류(HOLD)합니다.
 */
export async function ensureProcessPolicy(classId: string) {
  try {
    await getProcessPolicy(classId);
    return;
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404)) throw e;
  }
  const config = await getEvaluationConfiguration(classId);
  const ids = config.questions.map((question) => question.id);
  if (!ids.length) return;
  // 문항 비율은 똑같이 나누고(소수 넷째 자리), 남는 값은 마지막 문항에 더해 합계를 정확히 100으로 맞춥니다.
  const base = Math.floor(1_000_000 / ids.length);
  const questionWeights = ids.map((questionId, index) => ({
    questionId,
    weight: (index === ids.length - 1 ? 1_000_000 - base * (ids.length - 1) : base) / 10_000,
  }));
  await saveProcessPolicy(classId, {
    expectedVersion: 0,
    taskGoal: htmlToPlainText(config.guidelines ?? "").trim() || "수행평가 문항에 대해 스스로 생각해 답안을 작성합니다.",
    allowedRules: ALLOWED_RULES[config.aiPolicy] ?? ALLOWED_RULES.HINT_ONLY,
    noAiPolicy: "NOT_APPLICABLE",
    questionWeights,
  });
}
