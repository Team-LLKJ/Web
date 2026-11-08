// 수행평가(평가 틀)와 반(회차) 어댑터. 서버의 /api/teacher/assessments API를 화면에서 쓰기 쉬운 모양으로 바꿉니다.
import {
  createAssessment,
  createAssessmentClass,
  deleteAssessment,
  deleteAssessmentClass,
  endAssessmentClass,
  getAssessment,
  addCollaborator,
  getAssessments,
  getCollaborators,
  removeCollaborator,
  renameAssessmentClass,
  startAssessmentClass,
  openAssessmentClassLobby,
  type Assessment,
  type AssessmentClass,
  type AssessmentCollaborator,
  type AssessmentSummary,
} from "../api/assessments";
import type { AiPolicy, QuestionInput } from "../api/types";
import { htmlToPlainText } from "./guidelinesText";
import { isSharedFolderId, rememberShared } from "./sharedFolders";
export { isSharedFolderId };

export type SessionState = "READY" | "IN_PROGRESS" | "ENDED";

export type FolderSession = {
  id: string;
  className: string;
  state: SessionState;
  participants: number;
  submitted: number;
  pin?: string | null;
  endsAt?: string | null;
  /** 시작 전이지만 대기실을 열어 학생이 들어올 수 있는 상태. */
  lobbyOpen?: boolean;
};

export type EvaluationFolder = {
  id: string;
  title: string;
  description: string;
  /** 서식이 들어간 평가 안내(HTML 또는 예전 일반 텍스트). */
  guidelines: string;
  aiPolicy: AiPolicy;
  questions: string[];
  questionCount: number;
  criteria?: string[];
  antiCheat?: string[];
  createdAt: string;
  sessions: FolderSession[];
  /** 다른 선생님이 만들어 나와 공유한 수행평가면 만든 선생님 이름. 내가 만든 것은 비어 있습니다. */
  owner?: string;
  /** 내 권한. OWNER면 공유 관리·삭제까지 가능하고, EDITOR는 공동 편집만 합니다. */
  role?: "OWNER" | "EDITOR";
  /** 공유받은 선생님 수(소유자가 본인 수행평가를 몇 명에게 공유했는지). */
  collaboratorCount?: number;
  /** 수정 충돌 검사에 쓰는 버전. 저장할 때 그대로 돌려보냅니다. */
  revision?: number;
  /** 평가를 만들 때 정한 풀이 시간(분). 시작할 때 이 값을 씁니다. */
  durationMinutes?: number;
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
  lobbyOpen:
    item.state === "READY" &&
    (item.lobbyState === "WAITING" || (item.lobbyState == null && Boolean(item.pin))),
});

function toFolder(item: AssessmentSummary | Assessment): EvaluationFolder {
  const detail = "questions" in item ? item : undefined;
  return {
    id: item.id,
    title: item.title,
    description: detail ? htmlToPlainText(detail.guidelines ?? "") : "",
    guidelines: detail?.guidelines ?? "",
    aiPolicy: detail?.aiPolicy ?? "HINT_ONLY",
    questions: detail ? detail.questions.map((question) => question.content) : [],
    questionCount: item.questionCount,
    criteria: detail?.criteria,
    antiCheat: detail?.antiCheat,
    createdAt: detail?.createdAt ?? item.updatedAt,
    sessions: item.classes.map(toSession),
    owner: (item.myRole ?? item.role) === "EDITOR" ? item.owner?.name : undefined,
    role: item.myRole ?? item.role,
    collaboratorCount: item.collaboratorCount,
    revision: item.revision,
    durationMinutes: detail?.durationMinutes,
  };
}

// 화면을 오갈 때마다 스켈레톤이 다시 뜨지 않도록 마지막으로 받은 목록·상세를 기억해 두고,
// 화면은 먼저 기억한 내용을 보여 준 뒤 새 데이터로 바꿉니다(새로고침하면 비워집니다).
let listCache: EvaluationFolder[] | null = null;
const folderCache = new Map<string, EvaluationFolder>();

export const getCachedFolders = () => listCache;
export const getCachedFolder = (id: string) => folderCache.get(id) ?? null;

export function forgetFolder(id: string) {
  folderCache.delete(id);
  if (listCache) listCache = listCache.filter((item) => item.id !== id);
}

export async function listFolders(): Promise<EvaluationFolder[]> {
  const page = await getAssessments();
  listCache = page.items.map(toFolder);
  rememberShared(listCache);
  return listCache;
}

export async function getFolder(id: string): Promise<EvaluationFolder> {
  const folder = toFolder(await getAssessment(id));
  folderCache.set(id, folder);
  rememberShared([folder]);
  return folder;
}

export type NewFolderInput = {
  title: string;
  /** 서식이 들어간 평가 안내(HTML). */
  guidelines: string;
  aiPolicy: AiPolicy;
  questions: QuestionInput[];
  criteria: string[];
  antiCheat: string[];
  durationMinutes?: number;
};

export async function createFolder(input: NewFolderInput): Promise<EvaluationFolder> {
  listCache = null;
  return toFolder(await createAssessment(input));
}

export async function deleteFolder(id: string) {
  await deleteAssessment(id);
  forgetFolder(id);
}

export async function addSession(folderId: string, className: string) {
  return toSession(await createAssessmentClass(folderId, className));
}

export async function renameSession(folderId: string, sessionId: string, className: string) {
  return toSession(await renameAssessmentClass(folderId, sessionId, className));
}

export const removeSession = (folderId: string, sessionId: string) =>
  deleteAssessmentClass(folderId, sessionId);

export async function startSession(folderId: string, sessionId: string, expiresInMinutes: number) {
  return toSession(await startAssessmentClass(folderId, sessionId, expiresInMinutes));
}

export async function openSessionLobby(folderId: string, sessionId: string) {
  return toSession(await openAssessmentClassLobby(folderId, sessionId));
}

export async function endSession(folderId: string, sessionId: string) {
  return toSession(await endAssessmentClass(folderId, sessionId));
}

export type FolderCollaborator = AssessmentCollaborator;

export const listCollaborators = (folderId: string) => getCollaborators(folderId);
export const shareFolder = (folderId: string, email: string) => addCollaborator(folderId, email.trim());
export const unshareFolder = (folderId: string, teacherId: string) =>
  removeCollaborator(folderId, teacherId);
