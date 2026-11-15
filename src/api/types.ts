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
  /** 이 반이 속한 수행평가(폴더) id */
  assessmentId?: string;
  className?: string;
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
/** 교사가 내보낸 학생. 내보내도 채점 기록은 남습니다. */
export type ExpelledInfo = { expelled?: boolean; expelledAt?: string | null };

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
  /** 글자 수 제한을 어긴 문항(있으면 제출할 수 없습니다). */
  answerValidationErrors?: {
    questionId: string;
    actualChars: number;
    minChars: number | null;
    maxChars: number | null;
  }[];
  content: ReviewContent;
};

export type SubmissionMode = "MANUAL" | "AUTO_DEADLINE" | "AUTO_TEACHER_END";
export type Submission = {
  status: "SUBMITTED";
  submittedAt: string;
  snapshot: ReviewContent;
  submissionMode?: SubmissionMode;
};

export type ClientEventType =
  | "WINDOW_LEAVE"
  | "SHORTCUT_CAPTURE"
  | "FULLSCREEN_EXIT"
  | "DEVTOOLS_OPEN";
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
  expelled?: boolean;
  expelledAt?: string | null;
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
  /** 질문 용도 분류(Gemini 3번 → 엇갈리면 Haiku) 결과. */
  usageAnalysis?: PurposeUsageView | null;
};

/** 질문 용도 6종. OTHER는 비율에서 빼고, UNDECIDED는 판단 보류입니다. */
export type PurposeType = "UNDERSTAND" | "PLAN" | "REVIEW" | "EDIT" | "DRAFT" | "OTHER";
export type PurposeQuestion = {
  conversationId: number;
  questionId: string | null;
  quote: string;
  purpose: PurposeType | "UNDECIDED";
  votes: string[];
  haikuPurpose: PurposeType | null;
  needsReview: boolean;
  teacherPurpose: PurposeType | null;
  method: string;
  /** 답안 생성(DRAFT) 요청에 AI가 실제로 답안을 써 줬는지. 거절했으면 false, DRAFT가 아니면 null */
  aiComplied?: boolean | null;
};
export type PurposeUsageView = {
  method: string;
  status: string;
  questionCount: number;
  usage: { purpose: string; name: string; percentage: number; count: number }[];
  questions: PurposeQuestion[];
  limitations?: string[];
  reviewCount: number;
  otherCount: number;
  undecidedCount: number;
  pendingCount: number;
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
  /** 아래는 AI 루브릭 판정(과정 채점)에서만 채웁니다. */
  /** RECOMMENDED | HOLD | NOT_APPLICABLE | TEACHER_REVIEWED */
  status?: string;
  /** 지금 반영된 점수(교사 수정 포함). 없으면 미채점 */
  currentScore?: number | null;
  /** 교사 직접 입력이 필요한 이유 */
  reviewReason?: "DISAGREEMENT" | "INSUFFICIENT_DATA" | "NO_AI_USE" | "SAVE_ERROR" | "PROMPT_INJECTION" | "HAIKU_DECIDED" | "NO_VALID_VOTES" | "GEMINI_CALL_FAILED" | null;
  /** 판정이 엇갈렸는데 Haiku 판정이 없는 이유 */
  haikuError?: string | null;
  /** 채점 지시로 보여 AI 판정을 멈춘 학생 문장(PROMPT_INJECTION) */
  injectionText?: string | null;
  /** 무효 처리된 회차가 원래 낸 단계(0~4로 바꾼 값). votes와 같은 순서 */
  rawVotes?: (number | "NA" | "HOLD" | null)[];
  needsReview?: boolean;
  /** 참고용 판정: Gemini 회차별 단계와 Haiku 단계(0~4로 바꾼 값, 무효는 null) */
  votes?: (number | "NA" | "HOLD" | null)[];
  haikuLevel?: number | "NA" | "HOLD" | null;
  /** 바로 위 단계로 가지 못한 이유 */
  unmetNextLevel?: string | null;
  /** AI 판정의 가점·감점 이유와 원문 인용(대화 id가 있으면 대화로 이동) */
  reasons?: {
    kind: "가점" | "감점";
    title: string;
    explanation: string;
    quotes: { text: string; conversationId: number | null }[];
  }[];
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
  /** AI 루브릭 판정(과정 채점)에서 왔으면 true */
  process?: boolean;
  /** 보류 칸 배점 합(교사가 채울 때까지 비움), 해당 없음 칸의 원래 배점 합 */
  heldMaxScore?: number;
  notApplicableMaxScore?: number;
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
  /** 답안 문장별 출처 판정과 교사 확인이 필요한 문장 수 */
  sentences?: AnalysisSentence[];
  reviewCount?: number;
  semanticStatus?: string | null;
};

export type AnalysisSentence = {
  id: string;
  questionId: string;
  text: string;
  /** 판정 출처(교사 확정 전) */
  source: "DIRECT" | "AI";
  reason: string | null;
  needsReview: boolean;
  /** 교사가 확정한 출처 */
  teacherSource: "AI" | "DIRECT" | null;
  closestAiSentence: string | null;
  /** 긴 붙여넣기 구간과 겹치는 문장(다른 AI에서 가져왔을 수 있어 교사 확인 대상) */
  pasted?: boolean;
  /** 이 문장을 처음 만든 학생 대화 id(학생이 쓴 문장일 때). */
  studentFirstConversationId?: number | null;
  /** 이 문장이 가져온 AI 답변의 대화 번호 */
  conversationId?: number | null;
  start: number;
  end: number;
};

/** 서버가 제출·종료 시 자동으로 만드는 AI 사용 기록. 학생이 고칠 수 없습니다. */
export type AiDisclosure = {
  evaluationId?: string;
  participantId?: string;
  /** 사용한 AI(provider/model) 목록, 줄바꿈으로 구분. */
  tools: string;
  usedParts: string;
  reason: string;
  updatedAt: string | null;
  editable: boolean;
  /** 제출 전 PENDING, 완료 READY, 실패 FAILED. */
  status?: "PENDING" | "READY" | "FAILED";
  /** SYSTEM_GENERATED 자동 기록 · STUDENT_REPORTED 학생이 직접 쓴 설명 */
  source?: "SYSTEM_GENERATED" | "STUDENT_REPORTED" | string;
  errorCode?: string | null;
  failureReason?: string | null;
  /** 판단 근거가 된 대화 id. */
  conversationIds?: number[];
  evidence?: unknown[];
  /** 교사용 조회: 학생이 직접 쓴 설명(없으면 null) */
  studentDisclosure?: { tools: string; usedParts: string; reason: string } | null;
};

export type ApiMessage = { message: string };
export type TeacherInvitation = { inviteCode: string; school: string; expiresAt: string };

