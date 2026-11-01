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
    { responseType: "blob" },
  );
}
