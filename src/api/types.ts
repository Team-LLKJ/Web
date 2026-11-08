export type UserRole = "TEACHER" | "STUDENT";

export type User = {
  id: string;
  username: string;
  email: string;
  name: string;
  school: string;
  role: UserRole;
  status: "ACTIVE" | string;
  grade: number | null;
  classNumber: number | null;
  studentNumber: number | null;
  createdAt: string;
};

export type Tokens = {
  tokenType: "Bearer" | string;
  accessToken: string;
  accessExpiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
  user: User;
};

export type StudentSignup = {
  username: string;
  password: string;
  email: string;
  name: string;
  school: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
};

// 교사 회원가입: 이메일 인증 후 받은 emailVerificationToken으로 가입합니다(학교·초대 코드는 쓰지 않습니다).
export type TeacherSignup = {
  username: string;
  password: string;
  email: string;
  name: string;
  emailVerificationToken: string;
};

export type EmailVerificationSent = { expiresAt: string; resendAfterSeconds: number };
export type EmailVerificationConfirmed = { emailVerificationToken: string; expiresAt: string };

export type PolicyConsent = { version: string; accepted: boolean; acceptedAt: string | null };
export type Consents = {
  terms: PolicyConsent;
  privacy: PolicyConsent;
  requiresAcceptance: boolean;
};

export type LoginRequest = { username: string; password: string };
export type AiPolicy = "DISABLED" | "HINT_ONLY" | "FULL";
export type EvaluationState = "WAITING" | "STARTED" | "ENDED" | "EXPIRED";
export type StudentScreen = "WAITING" | "SOLVING" | "SUBMITTED" | "ENDED" | "EXPIRED";
export type WorkspaceStatus = "IN_PROGRESS" | "SUBMITTED" | "ENDED" | "EXPIRED";
export type AnswerSource = "DIRECT" | "AI_REFERENCED" | "AI_USED";

export type Evaluation = {
  id: string;
  title: string;
  pin: string;
  state: EvaluationState;
  expiresAt: string;
  joinUrl?: string;
  qrUrl?: string;
};

export type TeacherEvaluationSummary = {
  id: string;
  title: string;
  state: EvaluationState | string;
  pin?: string;
  expiresAt?: string;
  createdAt?: string;
};

export type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type CreateEvaluationRequest = {
  title: string;
  /** 생성 후 시작 전까지의 PIN 유효 시간(분). */
  expiresInMinutes: number;
  /** 실제 풀이 제한 시간(분, 1~1440). 생략하면 expiresInMinutes를 사용합니다. */
  durationMinutes?: number;
  /** 일반 텍스트 안내(최대 10,000자). */
  guidelines?: string;
};

export type QuestionInput = {
  position: number;
  title: string;
  content: string;
  /** 답안 최소/최대 글자 수(선택). 없으면 제한하지 않습니다. */
  minChars?: number | null;
  maxChars?: number | null;
};
export type ConfigureRequest = {
  aiPolicy: AiPolicy;
  questions: QuestionInput[];
  /** 생략/null이면 유지, 빈 문자열이면 삭제합니다. */
  guidelines?: string | null;
  durationMinutes?: number | null;
};
export type ApiQuestion = QuestionInput & { id: string };
export type Configuration = {
  evaluationId: string;
  aiPolicy: AiPolicy;
  questions: ApiQuestion[];
  guidelines?: string;
  durationMinutes?: number;
};

export type Participant = {
  id: string;
  nickname: string;
  presence: "CONNECTED" | "DISCONNECTED" | string;
};

export type Lobby = {
  evaluationId: string;
  title: string;
  state: EvaluationState;
  screen?: StudentScreen;
  /** 풀이 종료 예정 시각(ISO). 시작 전에는 null. */
  endsAt?: string | null;
  /** 응답 시점의 서버 시각(ISO). 남은 시간 = endsAt - serverNow. */
  serverNow?: string;
  participantCount: number;
  participants: Participant[];
};

export type JoinRequest = { pin: string; nickname: string };
export type ReconnectRequest = { evaluationId: string; participantToken: string };
/** PIN 없이 기존 참가자로 다시 들어온 결과. 대기 중이면 workspace=null, 종료·제출 후엔 readOnly=true. */
export type Reconnected = {
  evaluationId: string;
  participantId: string;
  nickname: string;
  lobby: Lobby;
  readOnly: boolean;
  workspace: Workspace | null;
};
export type Joined = { participantId: string; participantToken: string; lobby: Lobby };

export type ApiAnswer = {
  questionId: string;
  content: string;
  version: number;
  updatedAt: string | null;
};

export type QuestionAnswer = { question: ApiQuestion; answer: ApiAnswer };
export type Workspace = {
  evaluationId: string;
  participantId: string;
  status: WorkspaceStatus;
  readOnly: boolean;
  aiPolicy: AiPolicy;
  /** 교사가 작성한 일반 텍스트 안내(줄바꿈 유지). */
  guidelines?: string;
  evaluationContent?: string;
  /** 교사가 고른 평가 항목 제목. */
  criteria?: string[];
  /** 켜진 부정행위 방지 설정 코드(TAB_LEAVE, PRINT_BLOCK 등). */
  antiCheat?: string[];
  questions: QuestionAnswer[];
};

export type SaveAnswerRequest = {
  content: string;
  expectedVersion: number;
  source: AnswerSource;
  aiRequestId?: string | null;
};

export type TurnState = "PENDING" | "COMPLETED" | "FAILED";
export type Turn = {
  id: number;
  requestId: string;
  questionId: string;
  questionText: string;
  answerText: string | null;
  state: TurnState;
  errorCode: string | null;
  provider: string;
  model: string;
  aiPolicy: AiPolicy;
  answerVersion: number;
  createdAt: string;
  completedAt: string | null;
};

export type LearningEvent = {
  id: number;
  questionId: string | null;
  type: "ANSWER_SAVED" | "AI_REQUESTED" | "AI_COMPLETED" | "AI_FAILED" | "SUBMITTED" | string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type ReviewContent = {
  evaluationId: string;
  participantId: string;
  aiPolicy: AiPolicy;
  answers: QuestionAnswer[];
  conversations: Turn[];
  learningEvents: LearningEvent[];
};

export type Review = {
  reviewToken: string;
  canConfirm: boolean;
  blankQuestionIds: string[];
  content: ReviewContent;
};

export type SubmissionMode = "MANUAL" | "AUTO_DEADLINE" | "AUTO_TEACHER_END";
export type Submission = {
  status: "SUBMITTED";
  submittedAt: string;
  snapshot: ReviewContent;
  submissionMode?: SubmissionMode;
};

export type ClientEventType = "WINDOW_LEAVE" | "SHORTCUT_CAPTURE";
export type ClientEventRequest = {
  type: ClientEventType;
  occurredAt: string;
  questionId?: string | null;
};

// ───────── 교사 채점 화면 ─────────
export type GradingStatus = "WARNING" | "SUBMITTED" | "WRITING";
export type GradingStudent = {
  participantId: string;
  nickname: string;
  status: GradingStatus;
  activityWarning: boolean;
  submissionStatus: "NOT_SUBMITTED" | "SUBMITTED" | "CLOSED_UNSUBMITTED" | string;
  submittedAt: string | null;
  presence?: string;
};
export type GradingStudentList = PageResponse<GradingStudent> & {
  students: GradingStudent[];
  counts: { submitted: number; warning: number; writing: number };
};
export type GradingAnswerQuestion = {
  questionId: string;
  position: number;
  title: string;
  content: string;
  /** 글자 수 제한. 서버가 내려주면 문항 끝에 자동으로 보여 줍니다. */
  minChars?: number | null;
  maxChars?: number | null;
  answer: ApiAnswer | null;
};
export type GradingAnswers = {
  participantId: string;
  nickname: string;
  submittedAt: string | null;
  status: GradingStatus | string;
  questions: GradingAnswerQuestion[];
};
export type GradingMessage = {
  id: string;
  role: "USER" | "AI";
  content: string | null;
  questionId: string;
  createdAt: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  errorCode: string | null;
};
export type GradingActivity = {
  studentContribution: number | null;
  usage: { name: string; percentage: number; level: string; colorKey: string }[];
  warnings: {
    eventId: number;
    type: ClientEventType | string;
    questionId: string | null;
    occurredAt: string;
    receivedAt: string;
    clientReported: boolean;
  }[];
  warningsTotal: number;
  hasMoreWarnings: boolean;
  summary: string;
  analysisMethod: string;
};
export type RubricCriterion = {
  id: string;
  criterion: string;
  score: number | null;
  maxScore: number;
  feedback: string;
  evidence: string[];
  adjusted: boolean;
};
export type RubricAdjustment = {
  id: number;
  criterionId: string;
  previousScore: number | null;
  score: number | null;
  previousMaxScore: number;
  maxScore: number;
  teacherId: string;
  changedAt: string;
  reviewVersion: number;
};
export type GradingReview = {
  version: number;
  analysisStatus: string;
  analysisMethod: string;
  rubricStatus: string;
  criteria: RubricCriterion[];
  analysis: RubricCriterion[];
  adjustments: RubricAdjustment[];
};

// 기준별 점수(AI 추천 + 교사 점수) — /rubric-scores
export type RubricScoreAi = {
  level: number;
  score: number;
  reason: string;
  evidence: { conversationId?: number; quote?: string }[];
};
export type RubricScoreTeacher = {
  level: number;
  score: number;
  feedback: string;
  updatedAt?: string;
};
export type RubricScoreCriterion = {
  criterionId: number;
  name: string;
  maxScore: number;
  indicator: string;
  ai: RubricScoreAi | null;
  teacher: RubricScoreTeacher | null;
  adjusted: boolean;
};
export type RubricScores = {
  criteria: RubricScoreCriterion[];
  totalAi: number | null;
  totalTeacher: number | null;
  totalCurrent: number | null;
  status: "DRAFT" | "CONFIRMED";
  confirmedTotal: number | null;
  confirmedAt: string | null;
  analysisStatus?: string;
  compliance?: { ai: string | null; decision: string | null; note: string | null };
  participantId?: string;
  recommendedMaxScore: number | null;
  missingAiCriteria: string[];
};

/** 기준별 점수 변경 이력 한 줄. level은 0~4, null이면 지운 기록입니다. */
export type ScoreChange = {
  id: number;
  criterionId: number;
  previousLevel: number | null;
  level: number | null;
  aiLevel: number | null;
  teacherId: string;
  changedAt: string;
};

export type ComplianceDecision = "CONFIRMED_OK" | "HOLD" | "CONFIRMED_VIOLATION";

/** 규칙 기반 AI 활용 분석(추가 LLM 호출 없음). 기여도는 문장 유사도 추정이며 실제 저자 기여율이 아닙니다. */
export type AssessmentAnalysis = {
  status: string;
  aiPolicy?: string;
  aiLevel?: number | null;
  compliance?: { result: string; reasons: string[] } | null;
  contribution?: {
    direct: number;
    aiReferenced: number;
    aiUsed: number;
    basis: string;
  } | null;
  usage?: { type: string; label: string; count: number; share: number; level: string }[];
  indicators?: {
    indicator: string;
    value: number | null;
    level: number | null;
    reason: string;
    evidence: { conversationId?: number; quote?: string }[];
  }[];
  summary?: string;
  analyzedAt?: string | null;
  model?: string;
  limitations?: string[];
};

/** 학생이 직접 적는 AI 사용 기록. 제출 전까지 본인이 수정할 수 있습니다. */
export type AiDisclosure = {
  tools: string;
  usedParts: string;
  reason: string;
  updatedAt: string | null;
  editable: boolean;
};

export type ApiMessage = { message: string };
export type TeacherInvitation = { inviteCode: string; school: string; expiresAt: string };

