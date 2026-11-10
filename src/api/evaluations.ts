import { apiRequest, readEventStream } from "./client";
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
  AiDisclosure,
  AssessmentAnalysis,
  ComplianceDecision,
  ScoreChange,
  Reconnected,
  ReconnectRequest,
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

// 탭을 닫았다 다시 열었을 때 기존 참가 토큰으로 재접속합니다. 토큰은 URL이 아닌 본문으로만 보냅니다.
export function reconnectParticipant(evaluationId: string, participantToken: string) {
  return apiRequest<Reconnected>("/api/participation/reconnect", {
    method: "POST",
    body: { evaluationId, participantToken } satisfies ReconnectRequest,
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

/** 문항 하나의 서버 저장본. 저장한 적 없으면 content="" · version=0. */
export function getStudentAnswer(evaluationId: string, questionId: string) {
  return apiRequest<ApiAnswer>(
    `/api/evaluations/${idPath(evaluationId)}/questions/${idPath(questionId)}/answer`,
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
// 학생 본인 리포트. 제출 후 평가에서 나간 뒤에도 기존 참가 토큰으로 받을 수 있습니다(토큰은 헤더로만 보냄).
const myReportRequest = (participantToken: string) =>
  ({ auth: false, participant: true, participantToken }) as const;

export function createMyReport(evaluationId: string, participantToken: string) {
  return apiRequest<{ id: string; version: number; createdAt: string }>(
    `/api/evaluations/${idPath(evaluationId)}/reports`,
    { method: "POST", ...myReportRequest(participantToken) },
  );
}

export function getMyReport(evaluationId: string, participantToken: string) {
  return apiRequest<{ version: number }>(
    `/api/evaluations/${idPath(evaluationId)}/report`,
    myReportRequest(participantToken),
  );
}

export function getMyReportFile(
  evaluationId: string,
  participantToken: string,
  format: "pdf" | "hwp",
  version?: number,
) {
  const query = new URLSearchParams({ includeConversations: "false" });
  if (version !== undefined) query.set("version", String(version));
  return apiRequest<Blob>(
    `/api/evaluations/${idPath(evaluationId)}/report/${format}?${query}`,
    {
      responseType: "blob",
      accept:
        format === "pdf" ? "application/pdf, */*" : "application/x-hwp, */*",
      ...myReportRequest(participantToken),
    },
  );
}

/** 학생 AI 사용 기록 조회. 서버가 제출·종료 시 자동으로 만들며 학생은 수정할 수 없습니다(PUT은 호환용이라 쓰지 않습니다). */
export function getAiDisclosure(
  evaluationId: string,
  participantToken: string,
) {
  return apiRequest<AiDisclosure>(
    `/api/evaluations/${idPath(evaluationId)}/ai-disclosure`,
    myReportRequest(participantToken),
  );
}

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

/** 점수 변경 이력. 마지막 id를 다음 afterId로 넘겨 이어서 받습니다. */
export function getRubricScoreHistory(
  evaluationId: string,
  participantId: string,
  afterId = 0,
  limit = 100,
) {
  const query = new URLSearchParams({ afterId: String(afterId), limit: String(limit) });
  return apiRequest<ScoreChange[]>(
    `${rubricScorePath(evaluationId, participantId)}/history?${query}`,
  );
}

/** 허용 범위에 대한 교사 판단. 점수에는 영향이 없습니다. note 최대 1000자. */
export function saveComplianceReview(
  evaluationId: string,
  participantId: string,
  decision: ComplianceDecision,
  note: string,
) {
  return apiRequest<RubricScores>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/participants/${idPath(participantId)}/compliance-review`,
    { method: "PUT", body: { decision, note } },
  );
}

/** 규칙 기반 AI 활용 분석(기여도 추정·지표·허용 범위 점검). */
export function getAssessmentAnalysis(evaluationId: string, participantId: string) {
  return apiRequest<AssessmentAnalysis>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/participants/${idPath(participantId)}/analysis`,
  );
}

/** 제출한 학생 전체의 분석을 다시 예약합니다(비동기, 202). */
export function rerunAnalysis(evaluationId: string) {
  return apiRequest<{ evaluationId: string; queued: number; status: string }>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/analysis/run`,
    { method: "POST" },
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

/** 제출 리포트 생성(같은 내용이면 같은 버전을 돌려줍니다). HWP는 리포트가 있어야 받을 수 있습니다. */
export function createGradingReport(evaluationId: string, participantId: string) {
  return apiRequest<{ id: string; version: number; createdAt: string }>(
    `${studentPath(evaluationId, participantId)}/reports`,
    { method: "POST" },
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

export type ProcessPolicy = {
  version: number;
  rubricVersion: string;
  taskGoal: string;
  allowedRules: string;
  noAiPolicy: ProcessNoAiPolicy;
  questionWeights: { questionId: string; weight: number }[];
};

/** 결과 한 칸(문항별 4영역 + GLOBAL 투명성). 명세에 모양이 자세히 없어 선택 필드로 받습니다. */
export type ProcessCell = {
  questionId: string;
  criterion: string;
  level?: number | null;
  score?: number | null;
  maxScore?: number | null;
  status?: string;
  reason?: string;
  evidence?: unknown[];
};

export type ProcessResult = {
  status: string;
  compliance?: { status: string; reason: string; evidence?: unknown[]; limitations?: string[] } | null;
  cells: ProcessCell[];
  /** 모든 항목이 유효할 때만 숫자. 근거가 부족하면 null(0점 아님). */
  total: number | null;
  limitations?: string[];
};

export type ProcessJob = {
  id: string;
  evaluationId: string;
  participantId: string;
  version: number;
  status: ProcessJobStatus;
  inputHash?: string;
  rubricVersion: string;
  model: string | null;
  createdAt: string;
  completedAt: string | null;
  result: ProcessResult | null;
  errorCode: string | null;
};

export type ProcessOverride = { questionId: string; criterion: string; level: number; reason: string };

export type ProcessReview = {
  revision: number;
  teacherId: string;
  reviewedAt: string;
  overrides: ProcessOverride[];
  complianceDecision: ProcessComplianceDecision;
  complianceReason: string;
  result: ProcessResult | null;
  confirmed: boolean;
};

export type ProcessRubric = {
  rubricVersion: string;
  provisional: boolean;
  criteria: Record<string, unknown>[];
  criteriaMarkdown: string;
};

export const getProcessRubric = (evaluationId: string) =>
  apiRequest<ProcessRubric>(`${processPath(evaluationId)}/rubric`);

export const getProcessPolicy = (evaluationId: string) =>
  apiRequest<ProcessPolicy>(`${processPath(evaluationId)}/policy`);

export const saveProcessPolicy = (
  evaluationId: string,
  body: Omit<ProcessPolicy, "version" | "rubricVersion"> & { expectedVersion: number },
) => apiRequest<ProcessPolicy>(`${processPath(evaluationId)}/policy`, { method: "PUT", body });

export const listProcessRuns = (evaluationId: string, participantId: string) =>
  apiRequest<ProcessJob[]>(processRunPath(evaluationId, participantId));

export const startProcessRun = (evaluationId: string, participantId: string) =>
  apiRequest<ProcessJob>(processRunPath(evaluationId, participantId), { method: "POST" });

export const getProcessRun = (evaluationId: string, participantId: string, jobId: string) =>
  apiRequest<ProcessJob>(`${processRunPath(evaluationId, participantId)}/${idPath(jobId)}`);

export const getProcessEvidence = (evaluationId: string, participantId: string, jobId: string) =>
  apiRequest<Record<string, unknown>>(
    `${processRunPath(evaluationId, participantId)}/${idPath(jobId)}/evidence`,
  );

export const getProcessReview = (evaluationId: string, participantId: string, jobId: string) =>
  apiRequest<ProcessReview>(
    `${processRunPath(evaluationId, participantId)}/${idPath(jobId)}/review`,
  );

export const saveProcessReview = (
  evaluationId: string,
  participantId: string,
  jobId: string,
  body: {
    expectedRevision: number;
    overrides: ProcessOverride[];
    complianceDecision: ProcessComplianceDecision;
    complianceReason: string;
  },
) =>
  apiRequest<ProcessReview>(
    `${processRunPath(evaluationId, participantId)}/${idPath(jobId)}/review`,
    { method: "PUT", body },
  );

export const getProcessReviewHistory = (evaluationId: string, participantId: string, jobId: string) =>
  apiRequest<ProcessReview[]>(
    `${processRunPath(evaluationId, participantId)}/${idPath(jobId)}/review/history`,
  );

export const confirmProcessReview = (
  evaluationId: string,
  participantId: string,
  jobId: string,
  expectedRevision: number,
) =>
  apiRequest<ProcessReview>(
    `${processRunPath(evaluationId, participantId)}/${idPath(jobId)}/confirm`,
    { method: "POST", body: { expectedRevision } },
  );

/** 교사 화면용 제출·경고 실시간(SSE) 스트림. 연결이 끝나면 Promise가 끝납니다. */
export function streamLiveEvents(
  evaluationId: string,
  options: Parameters<typeof readEventStream>[1],
) {
  return readEventStream(
    `/api/teacher/evaluations/${encodeURIComponent(evaluationId)}/live-events`,
    options,
  );
}

/** 교사: 참여자 내보내기(204). 대기·진행 중에만 가능하고, 반복 요청해도 같은 결과입니다(409 EVALUATION_ENDED). */
export function expelParticipant(evaluationId: string, participantId: string) {
  return apiRequest<void>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/participants/${idPath(participantId)}`,
    { method: "DELETE" },
  );
}

/** 학생: 내 평가 세션 상태와 안내 동의 상태. 내보내진 학생은 403 PARTICIPANT_EXPELLED. */
export type StudentSession = {
  status?: "WAITING" | "IN_PROGRESS" | "SUBMITTED" | "ENDED" | "EXPIRED" | string;
  readOnly?: boolean;
  submitted?: boolean;
  policy?: { policyVersion?: string; accepted?: boolean; acceptedAt?: string | null } & Record<string, unknown>;
} & Record<string, unknown>;
export function getStudentSession(evaluationId: string) {
  return apiRequest<StudentSession>(`/api/student/evaluations/${idPath(evaluationId)}/me`, {
    participantEvaluationId: evaluationId,
  });
}

/** 학생: 평가 안내 동의. policyVersion 은 /me 의 policy.policyVersion 을 그대로 보냅니다. */
export function acceptEvaluationPolicy(evaluationId: string, policyVersion: string) {
  return apiRequest<Record<string, unknown>>(
    `/api/student/evaluations/${idPath(evaluationId)}/policy-acceptance`,
    { method: "POST", body: { policyVersion }, participantEvaluationId: evaluationId },
  );
}

export type ReportArchiveFormat = "PDF" | "HWP";
const archiveQuery = (format: ReportArchiveFormat, includeConversations: boolean) =>
  new URLSearchParams({ format, includeConversations: String(includeConversations) }).toString();

/** 교사: 보고서 ZIP 바로 내려받기(최대 200명·100MiB, 넘으면 413 REPORT_ARCHIVE_LIMIT). 결과는 manifest.json 포함. */
export function getEvaluationReportsArchive(
  evaluationId: string,
  format: ReportArchiveFormat = "PDF",
  includeConversations = false,
) {
  return apiRequest<Blob>(
    `/api/teacher/evaluations/${idPath(evaluationId)}/reports/archive?${archiveQuery(format, includeConversations)}`,
    { responseType: "blob", accept: "application/zip, */*" },
  );
}
