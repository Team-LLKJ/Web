import { apiRequest } from "./client";
import type {
  ApiAnswer,
  ApiMessage,
  ConfigureRequest,
  CreateEvaluationRequest,
  ClientEventRequest,
  Configuration,
  Evaluation,
  GradingActivity,
  GradingAnswers,
  GradingMessage,
  GradingReview,
  GradingStudentList,
  RubricAdjustment,
  Joined,
  LearningEvent,
  Lobby,
  PageResponse,
  QuestionAnswer,
  Review,
  RubricScores,
  SaveAnswerRequest,
  Submission,
  Turn,
  TeacherEvaluationSummary,
  Workspace,
} from "./types";

const idPath = (id: string) => encodeURIComponent(id);
const participantRequest = (evaluationId: string) =>
  ({
    auth: false,
    participant: true,
    participantEvaluationId: evaluationId,
  }) as const;

export function createEvaluation(payload: CreateEvaluationRequest) {
  return apiRequest<Evaluation>("/api/teacher/evaluations", {
    method: "POST",
    body: payload,
  });
}

export function getMyEvaluations(page = 0, size = 20) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  return apiRequest<PageResponse<TeacherEvaluationSummary>>(
    `/api/teacher/evaluations?${query}`,
  );
}

export function getEvaluation(evaluationId: string) {
  return apiRequest<Evaluation>(
    `/api/teacher/evaluations/${idPath(evaluationId)}`,
  );
}

export function deleteEvaluation(evaluationId: string) {
  return apiRequest<void>(`/api/teacher/evaluations/${idPath(evaluationId)}`, {
    method: "DELETE",
  });
}

export function getEvaluationQr(evaluationId: string) {
  return apiRequest<Blob>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/qr`,
    { responseType: "blob" },
  );
}

export function getParticipants(evaluationId: string) {
  return apiRequest<Lobby>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/participants`,
  );
}

export function startEvaluation(evaluationId: string) {
  return apiRequest<Lobby>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/start`,
    { method: "POST" },
  );
}

export function endEvaluation(evaluationId: string) {
  return apiRequest<Lobby>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/end`,
    { method: "POST" },
  );
}

// 평가 중 유효 시간 연장. 서버 API가 확정되기 전의 제안 경로입니다(백엔드 요청 필요).
export function extendEvaluation(evaluationId: string, additionalMinutes: number) {
  return apiRequest<Lobby>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/extend`,
    { method: "POST", body: { additionalMinutes } },
  );
}

export function configureEvaluation(
  evaluationId: string,
  payload: ConfigureRequest,
) {
  return apiRequest<Configuration>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/configuration`,
    { method: "PUT", body: payload },
  );
}

export function getEvaluationConfiguration(evaluationId: string) {
  return apiRequest<Configuration>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/configuration`,
  );
}

export function getTeacherLearningEvents(
  evaluationId: string,
  participantId: string,
  afterId = 0,
  limit = 100,
) {
  const query = new URLSearchParams({
    afterId: String(afterId),
    limit: String(limit),
  });
  return apiRequest<LearningEvent[]>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/participants/${idPath(participantId)}/learning-events?${query}`,
  );
}

export function verifyPin(pin: string) {
  const query = new URLSearchParams({ pin: pin.trim() });
  return apiRequest<Evaluation>(`/api/participation/verify?${query}`, {
    auth: false,
  });
}

export function joinEvaluation(payload: { pin: string; nickname?: string }) {
  return apiRequest<Joined>("/api/participation/join", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function getStudentState(evaluationId: string) {
  return apiRequest<Lobby>(
    `/api/evaluations/${idPath(evaluationId)}/state`,
    participantRequest(evaluationId),
  );
}

export function sendHeartbeat(evaluationId: string) {
  return apiRequest<Lobby>(
    `/api/evaluations/${idPath(evaluationId)}/heartbeat`,
    { method: "POST", ...participantRequest(evaluationId) },
  );
}

export function leaveEvaluation(evaluationId: string) {
  return apiRequest<ApiMessage>(
    `/api/evaluations/${idPath(evaluationId)}/leave`,
    { method: "POST", ...participantRequest(evaluationId) },
  );
}

export function getStudentWorkspace(evaluationId: string) {
  return apiRequest<Workspace>(
    `/api/evaluations/${idPath(evaluationId)}/questions`,
    participantRequest(evaluationId),
  );
}

export function getStudentQuestion(evaluationId: string, questionId: string) {
  return apiRequest<QuestionAnswer>(
    `/api/evaluations/${idPath(evaluationId)}/questions/${idPath(questionId)}`,
    participantRequest(evaluationId),
  );
}

export function saveStudentAnswer(
  evaluationId: string,
  questionId: string,
  payload: SaveAnswerRequest,
) {
  return apiRequest<ApiAnswer>(
    `/api/evaluations/${idPath(evaluationId)}/questions/${idPath(questionId)}/answer`,
    { method: "PUT", body: payload, ...participantRequest(evaluationId) },
  );
}

export function askQuestion(
  evaluationId: string,
  questionId: string,
  requestId: string,
  text: string,
) {
  return apiRequest<Turn>(
    `/api/evaluations/${idPath(evaluationId)}/questions/${idPath(questionId)}/ai/questions`,
    {
      method: "POST",
      body: { requestId, text },
      ...participantRequest(evaluationId),
    },
  );
}

export function getConversations(
  evaluationId: string,
  options: { questionId?: string; afterId?: number; limit?: number } = {},
) {
  const query = new URLSearchParams({
    afterId: String(options.afterId ?? 0),
    limit: String(options.limit ?? 100),
  });
  if (options.questionId) query.set("questionId", options.questionId);
  return apiRequest<Turn[]>(
    `/api/evaluations/${idPath(evaluationId)}/conversations?${query}`,
    participantRequest(evaluationId),
  );
}

export function getStudentLearningEvents(
  evaluationId: string,
  afterId = 0,
  limit = 100,
) {
  const query = new URLSearchParams({
    afterId: String(afterId),
    limit: String(limit),
  });
  return apiRequest<LearningEvent[]>(
    `/api/evaluations/${idPath(evaluationId)}/learning-events?${query}`,
    participantRequest(evaluationId),
  );
}

export function getSubmissionPreview(evaluationId: string) {
  return apiRequest<Review>(
    `/api/evaluations/${idPath(evaluationId)}/submission-preview`,
    participantRequest(evaluationId),
  );
}

export function confirmSubmission(evaluationId: string, reviewToken: string) {
  return apiRequest<Submission>(
    `/api/evaluations/${idPath(evaluationId)}/submission`,
    {
      method: "POST",
      body: { reviewToken },
      ...participantRequest(evaluationId),
    },
  );
}

export function getSubmission(evaluationId: string) {
  return apiRequest<Submission>(
    `/api/evaluations/${idPath(evaluationId)}/submission`,
    participantRequest(evaluationId),
  );
}

/** 창 이탈·캡처 단축키 신고. 멱등 키가 없으므로 같은 사건을 자동 재전송하지 마세요. */
export function sendClientEvent(
  evaluationId: string,
  payload: ClientEventRequest,
) {
  return apiRequest<LearningEvent>(
    `/api/student/evaluations/${idPath(evaluationId)}/events`,
    { method: "POST", body: payload, ...participantRequest(evaluationId) },
  );
}

// ───────── 교사 채점 화면 ─────────
const studentsPath = (evaluationId: string) =>
  `/api/teacher/evaluations/${idPath(evaluationId)}/students`;
const studentPath = (evaluationId: string, participantId: string) =>
  `${studentsPath(evaluationId)}/${idPath(participantId)}`;

export function getGradingStudents(
  evaluationId: string,
  options: { query?: string; page?: number; size?: number } = {},
) {
  const query = new URLSearchParams({
    page: String(options.page ?? 0),
    size: String(options.size ?? 100),
  });
  if (options.query?.trim()) query.set("query", options.query.trim());
  return apiRequest<GradingStudentList>(
    `${studentsPath(evaluationId)}?${query}`,
  );
}

export function getGradingAnswers(evaluationId: string, participantId: string) {
  return apiRequest<GradingAnswers>(
    `${studentPath(evaluationId, participantId)}/answers`,
  );
}

export function getGradingConversations(
  evaluationId: string,
  participantId: string,
  options: { questionId?: string; page?: number; size?: number } = {},
) {
  const query = new URLSearchParams({
    page: String(options.page ?? 0),
    size: String(options.size ?? 200),
  });
  if (options.questionId) query.set("questionId", options.questionId);
  return apiRequest<GradingMessage[]>(
    `${studentPath(evaluationId, participantId)}/conversations?${query}`,
  );
}

export function getGradingActivity(evaluationId: string, participantId: string) {
  return apiRequest<GradingActivity>(
    `${studentPath(evaluationId, participantId)}/activity`,
  );
}

export function getGradingReview(evaluationId: string, participantId: string) {
  return apiRequest<GradingReview>(
    `${studentPath(evaluationId, participantId)}/review`,
  );
}

/** score: 0~20 정수, null이면 점수 제거. 제출 후에만 가능합니다. */
export function saveCriterionScore(
  evaluationId: string,
  participantId: string,
  criterionId: string,
  score: number | null,
  expectedVersion?: number,
) {
  return apiRequest<GradingReview>(
    `${studentPath(evaluationId, participantId)}/review/criteria/${idPath(criterionId)}`,
    {
      method: "PUT",
      body: expectedVersion === undefined ? { score } : { score, expectedVersion },
    },
  );
}

export function getReviewHistory(
  evaluationId: string,
  participantId: string,
  afterId = 0,
  limit = 100,
) {
  const query = new URLSearchParams({
    afterId: String(afterId),
    limit: String(limit),
  });
  return apiRequest<RubricAdjustment[]>(
    `${studentPath(evaluationId, participantId)}/review/history?${query}`,
  );
}

// 기준별 점수: AI 추천(ai)과 교사 점수(teacher)를 함께 다룹니다. id는 반 회차입니다.
const rubricScorePath = (evaluationId: string, participantId: string) =>
  `/api/teacher/evaluations/${idPath(evaluationId)}/participants/${idPath(participantId)}/rubric-scores`;

export function getRubricScores(evaluationId: string, participantId: string) {
  return apiRequest<RubricScores>(rubricScorePath(evaluationId, participantId));
}

/** level 0~4(0 매우 못함 ~ 4 매우 잘함). level·feedback을 모두 생략하면 그 기준의 교사 점수를 지웁니다. */
export function saveRubricScore(
  evaluationId: string,
  participantId: string,
  criterionId: number,
  body: { level?: number; feedback?: string },
) {
  return apiRequest<RubricScores>(
    `${rubricScorePath(evaluationId, participantId)}/${criterionId}`,
    { method: "PUT", body },
  );
}

/** 모든 기준에 교사 값이 있어야 확정됩니다(부족하면 409 GRADING_INCOMPLETE). */
export function confirmGrade(
  evaluationId: string,
  participantId: string,
  acceptAiForMissing = false,
) {
  return apiRequest<RubricScores>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/participants/${idPath(participantId)}/grade/confirm`,
    { method: "POST", body: { acceptAiForMissing } },
  );
}

/** 제출 후 사용 가능(미제출 409). 토큰은 헤더로 전송되므로 Blob으로 받습니다. */
export function getGradingReportPdf(
  evaluationId: string,
  participantId: string,
  includeConversations = false,
) {
  const query = new URLSearchParams({
    includeConversations: String(includeConversations),
  });
  return apiRequest<Blob>(
    `${studentPath(evaluationId, participantId)}/report.pdf?${query}`,
    { responseType: "blob", accept: "application/pdf, */*" },
  );
}

/** 저장된 리포트의 HWP 파일. 리포트가 없으면 404이니 먼저 리포트를 만들어야 합니다. */
export function getGradingReportHwp(
  evaluationId: string,
  participantId: string,
  options: { version?: number; includeConversations?: boolean } = {},
) {
  const query = new URLSearchParams({
    includeConversations: String(options.includeConversations ?? false),
  });
  if (options.version) query.set("version", String(options.version));
  return apiRequest<Blob>(
    `${studentPath(evaluationId, participantId)}/report/hwp?${query}`,
    { responseType: "blob", accept: "application/x-hwp, */*" },
  );
}

// 과정 평가(프로세스 채점) API. 기존 키워드 채점·PDF/HWP와는 별도입니다. id는 반 회차(classId)입니다.
const processPath = (evaluationId: string) =>
  `/api/teacher/evaluations/${idPath(evaluationId)}/process-grading`;
const processRunPath = (evaluationId: string, participantId: string) =>
  `${processPath(evaluationId)}/participants/${idPath(participantId)}/runs`;

export type ProcessJobStatus = "PENDING" | "RUNNING" | "DONE" | "HOLD" | "NOT_APPLICABLE" | "FAILED";
export type ProcessComplianceDecision = "CONFIRMED_OK" | "HOLD" | "CONFIRMED_VIOLATION";
export type ProcessNoAiPolicy = "HOLD" | "NOT_APPLICABLE" | "USE_RECORDED_EVIDENCE";

export const getProcessRubric = (evaluationId: string) =>
  apiRequest<{
    rubricVersion: string;
    provisional: boolean;
    criteria: unknown[];
    criteriaMarkdown: string;
  }>(`${processPath(evaluationId)}/rubric`);

export const getProcessPolicy = (evaluationId: string) =>
  apiRequest<Record<string, unknown>>(`${processPath(evaluationId)}/policy`);

export const saveProcessPolicy = (evaluationId: string, body: Record<string, unknown>) =>
  apiRequest<Record<string, unknown>>(`${processPath(evaluationId)}/policy`, { method: "PUT", body });

export const listProcessRuns = (evaluationId: string, participantId: string) =>
  apiRequest<Record<string, unknown>[]>(processRunPath(evaluationId, participantId));

export const startProcessRun = (evaluationId: string, participantId: string) =>
  apiRequest<Record<string, unknown>>(processRunPath(evaluationId, participantId), { method: "POST" });

export const getProcessRun = (evaluationId: string, participantId: string, jobId: string) =>
  apiRequest<Record<string, unknown>>(`${processRunPath(evaluationId, participantId)}/${idPath(jobId)}`);

export const getProcessEvidence = (evaluationId: string, participantId: string, jobId: string) =>
  apiRequest<Record<string, unknown>>(
    `${processRunPath(evaluationId, participantId)}/${idPath(jobId)}/evidence`,
  );

export const getProcessReview = (evaluationId: string, participantId: string, jobId: string) =>
  apiRequest<Record<string, unknown>>(
    `${processRunPath(evaluationId, participantId)}/${idPath(jobId)}/review`,
  );

export const saveProcessReview = (
  evaluationId: string,
  participantId: string,
  jobId: string,
  body: Record<string, unknown>,
) =>
  apiRequest<Record<string, unknown>>(
    `${processRunPath(evaluationId, participantId)}/${idPath(jobId)}/review`,
    { method: "PUT", body },
  );

export const getProcessReviewHistory = (evaluationId: string, participantId: string, jobId: string) =>
  apiRequest<Record<string, unknown>[]>(
    `${processRunPath(evaluationId, participantId)}/${idPath(jobId)}/review/history`,
  );

export const confirmProcessReview = (
  evaluationId: string,
  participantId: string,
  jobId: string,
  expectedRevision: number,
) =>
  apiRequest<Record<string, unknown>>(
    `${processRunPath(evaluationId, participantId)}/${idPath(jobId)}/confirm`,
    { method: "POST", body: { expectedRevision } },
  );
