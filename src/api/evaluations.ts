import { apiRequest } from "./client";
import type {
  ApiAnswer,
  ApiMessage,
  ApiQuestion,
  ConfigureRequest,
  CreateEvaluationRequest,
  Evaluation,
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
const participantRequest = (evaluationId: string) => ({
  auth: false,
  participant: true,
  participantEvaluationId: evaluationId,
} as const);

export function createEvaluation(payload: CreateEvaluationRequest) {
  return apiRequest<Evaluation>("/api/teacher/evaluations", { method: "POST", body: payload });
}

export function getMyEvaluations(page = 0, size = 20) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  return apiRequest<PageResponse<TeacherEvaluationSummary>>(`/api/teacher/evaluations?${query}`);
}

export function getEvaluation(evaluationId: string) {
  return apiRequest<Evaluation>(`/api/teacher/evaluations/${idPath(evaluationId)}`);
}

export function getEvaluationQr(evaluationId: string) {
  return apiRequest<Blob>(`/api/teacher/evaluations/${idPath(evaluationId)}/qr`, { responseType: "blob" });
}

export function getParticipants(evaluationId: string) {
  return apiRequest<Lobby>(`/api/teacher/evaluations/${idPath(evaluationId)}/participants`);
}

export function startEvaluation(evaluationId: string) {
  return apiRequest<Lobby>(`/api/teacher/evaluations/${idPath(evaluationId)}/start`, { method: "POST" });
}

export function endEvaluation(evaluationId: string) {
  return apiRequest<Lobby>(`/api/teacher/evaluations/${idPath(evaluationId)}/end`, { method: "POST" });
}

export function configureEvaluation(evaluationId: string, payload: ConfigureRequest) {
  return apiRequest<{ evaluationId: string; aiPolicy: string; questions: ApiQuestion[] }>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/questions`,
    { method: "PUT", body: payload },
  );
}

export function getEvaluationConfiguration(evaluationId: string) {
  return apiRequest<{ evaluationId: string; aiPolicy: string; questions: ApiQuestion[] }>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/questions`,
  );
}

export function getTeacherLearningEvents(
  evaluationId: string,
  participantId: string,
  afterId = 0,
  limit = 100,
) {
  const query = new URLSearchParams({ afterId: String(afterId), limit: String(limit) });
  return apiRequest<LearningEvent[]>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/participants/${idPath(participantId)}/learning-events?${query}`,
  );
}

export function verifyPin(pin: string) {
  const query = new URLSearchParams({ pin: pin.trim() });
  return apiRequest<Evaluation>(`/api/participation/verify?${query}`, { auth: false });
}

export function joinEvaluation(payload: { pin: string; nickname?: string }) {
  return apiRequest<Joined>("/api/participation/join", { method: "POST", body: payload, auth: false });
}

export function getStudentState(evaluationId: string) {
  return apiRequest<Lobby>(`/api/evaluations/${idPath(evaluationId)}/state`, participantRequest(evaluationId));
}

export function sendHeartbeat(evaluationId: string) {
  return apiRequest<Lobby>(`/api/evaluations/${idPath(evaluationId)}/heartbeat`, { method: "POST", ...participantRequest(evaluationId) });
}

export function leaveEvaluation(evaluationId: string) {
  return apiRequest<ApiMessage>(`/api/evaluations/${idPath(evaluationId)}/leave`, { method: "POST", ...participantRequest(evaluationId) });
}

export function getStudentWorkspace(evaluationId: string) {
  return apiRequest<Workspace>(`/api/evaluations/${idPath(evaluationId)}/questions`, participantRequest(evaluationId));
}

export function getStudentQuestion(evaluationId: string, questionId: string) {
  return apiRequest<QuestionAnswer>(
    `/api/evaluations/${idPath(evaluationId)}/questions/${idPath(questionId)}`,
    participantRequest(evaluationId),
  );
}

export function saveStudentAnswer(evaluationId: string, questionId: string, payload: SaveAnswerRequest) {
  return apiRequest<ApiAnswer>(
    `/api/evaluations/${idPath(evaluationId)}/questions/${idPath(questionId)}/answer`,
    { method: "PUT", body: payload, ...participantRequest(evaluationId) },
  );
}

export function askQuestion(evaluationId: string, questionId: string, requestId: string, text: string) {
  return apiRequest<Turn>(
    `/api/evaluations/${idPath(evaluationId)}/questions/${idPath(questionId)}/ai/questions`,
    { method: "POST", body: { requestId, text }, ...participantRequest(evaluationId) },
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
  return apiRequest<Turn[]>(`/api/evaluations/${idPath(evaluationId)}/conversations?${query}`, participantRequest(evaluationId));
}

export function getStudentLearningEvents(evaluationId: string, afterId = 0, limit = 100) {
  const query = new URLSearchParams({ afterId: String(afterId), limit: String(limit) });
  return apiRequest<LearningEvent[]>(`/api/evaluations/${idPath(evaluationId)}/learning-events?${query}`, participantRequest(evaluationId));
}

export function getSubmissionPreview(evaluationId: string) {
  return apiRequest<Review>(`/api/evaluations/${idPath(evaluationId)}/submission-preview`, participantRequest(evaluationId));
}

export function confirmSubmission(evaluationId: string, reviewToken: string) {
  return apiRequest<Submission>(`/api/evaluations/${idPath(evaluationId)}/submission`, {
    method: "POST",
    body: { reviewToken },
    ...participantRequest(evaluationId),
  });
}

export function getSubmission(evaluationId: string) {
  return apiRequest<Submission>(`/api/evaluations/${idPath(evaluationId)}/submission`, participantRequest(evaluationId));
}

