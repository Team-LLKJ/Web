// 수행평가(평가 틀)와 반(회차) 어댑터. 서버의 /api/teacher/assessments API를 화면에서 쓰기 쉬운 모양으로 바꿉니다.
import {
  createAssessment,
  createAssessmentClass,
  deleteAssessment,
  deleteAssessmentClass,
  endAssessmentClass,
  getAssessment,
  getAssessments,
  startAssessmentClass,
  type Assessment,
  type AssessmentClass,
  type AssessmentSummary,
} from "../api/assessments";
import type { AiPolicy, QuestionInput } from "../api/types";
import { htmlToPlainText } from "./guidelinesText";

export type SessionState = "READY" | "IN_PROGRESS" | "ENDED";

export type FolderSession = {
  id: string;
  className: string;
  state: SessionState;
  participants: number;
  submitted: number;
  pin?: string | null;
  endsAt?: string | null;
};

export type EvaluationFolder = {
  id: string;
  title: string;
  description: string;
  aiPolicy: AiPolicy;
  questions: string[];
  questionCount: number;
  criteria?: string[];
  antiCheat?: string[];
  createdAt: string;
  sessions: FolderSession[];
  /** 다른 선생님이 만들어 나와 공유한 수행평가면 만든 선생님 이름. 내가 만든 것은 비어 있습니다. */
  owner?: string;
};

const toState = (state: AssessmentClass["state"]): SessionState =>
  state === "STARTED" ? "IN_PROGRESS" : state;

export const toSession = (item: AssessmentClass): FolderSession => ({
  id: item.classId,
  className: item.className,
  state: toState(item.state),
  participants: item.participantCount,
  submitted: item.submittedCount,
  pin: item.pin,
  endsAt: item.endsAt,
});

function toFolder(item: AssessmentSummary | Assessment): EvaluationFolder {
  const detail = "questions" in item ? item : undefined;
  return {
    id: item.id,
    title: item.title,
    description: detail ? htmlToPlainText(detail.guidelines ?? "") : "",
    aiPolicy: detail?.aiPolicy ?? "HINT_ONLY",
    questions: detail ? detail.questions.map((question) => question.content) : [],
    questionCount: item.questionCount,
    criteria: detail?.criteria,
    antiCheat: detail?.antiCheat,
    createdAt: detail?.createdAt ?? item.updatedAt,
    sessions: item.classes.map(toSession),
  };
}

export async function listFolders(): Promise<EvaluationFolder[]> {
  const page = await getAssessments();
  return page.items.map(toFolder);
}

export async function getFolder(id: string): Promise<EvaluationFolder> {
  return toFolder(await getAssessment(id));
}

export type NewFolderInput = {
  title: string;
  /** 서식이 들어간 평가 안내(HTML). */
  guidelines: string;
  aiPolicy: AiPolicy;
  questions: QuestionInput[];
  criteria: string[];
  antiCheat: string[];
};

export async function createFolder(input: NewFolderInput): Promise<EvaluationFolder> {
  return toFolder(await createAssessment(input));
}

export const deleteFolder = (id: string) => deleteAssessment(id);

export async function addSession(folderId: string, className: string) {
  return toSession(await createAssessmentClass(folderId, className));
}

export const removeSession = (folderId: string, sessionId: string) =>
  deleteAssessmentClass(folderId, sessionId);

export async function startSession(folderId: string, sessionId: string, expiresInMinutes: number) {
  return toSession(await startAssessmentClass(folderId, sessionId, expiresInMinutes));
}

export async function endSession(folderId: string, sessionId: string) {
  return toSession(await endAssessmentClass(folderId, sessionId));
}
