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

export type TeacherSignup = {
  username: string;
  password: string;
  email: string;
  name: string;
  school: string;
  inviteCode: string;
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
  expiresInMinutes: number;
};

export type QuestionInput = { position: number; title: string; content: string };
export type ConfigureRequest = { aiPolicy: AiPolicy; questions: QuestionInput[] };
export type ApiQuestion = QuestionInput & { id: string };
export type Configuration = { evaluationId: string; aiPolicy: AiPolicy; questions: ApiQuestion[] };

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
  participantCount: number;
  participants: Participant[];
};

export type JoinRequest = { pin: string; nickname: string };
export type ReconnectRequest = { pin: string };
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

export type Submission = {
  status: "SUBMITTED";
  submittedAt: string;
  snapshot: ReviewContent;
};

export type ApiMessage = { message: string };
export type TeacherInvitation = { inviteCode: string; school: string; expiresAt: string };

