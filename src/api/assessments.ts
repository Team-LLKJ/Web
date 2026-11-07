import { apiRequest } from "./client";
import type { AiPolicy, PageResponse, QuestionInput } from "./types";

// 수행평가 틀(assessment)과 반별 회차(class) API. 반의 classId가 곧 기존 evaluationId입니다.
export type ClassState = "READY" | "STARTED" | "ENDED";

export type AssessmentClass = {
  classId: string;
  evaluationId: string;
  assessmentId: string;
  className: string;
  state: ClassState;
  /** 대기실 상태. 대기실을 열면 state=READY 그대로이고 lobbyState=WAITING이 됩니다. */
  lobbyState?: string | null;
  evaluationState: string;
  pin: string | null;
  joinUrl: string | null;
  qrUrl: string | null;
  expiresAt: string | null;
  endsAt: string | null;
  participantCount: number;
  submittedCount: number;
  templateRevision: number;
};

export type AssessmentRole = "OWNER" | "EDITOR";

export type AssessmentOwner = { teacherId: string; name: string };

export type AssessmentSummary = {
  id: string;
  title: string;
  /** 소유자. 내가 만든 수행평가면 나 자신입니다. */
  owner?: AssessmentOwner;
  /** 내 권한: OWNER(만든 사람) 또는 EDITOR(공유받은 사람). */
  role?: AssessmentRole;
  myRole?: AssessmentRole;
  collaboratorCount?: number;
  shared?: boolean;
  questionCount: number;
  classCount: number;
  classes: AssessmentClass[];
  revision: number;
  updatedAt: string;
};

export type Assessment = AssessmentSummary & {
  guidelines: string;
  aiPolicy: AiPolicy;
  criteria: string[];
  antiCheat: string[];
  questions: (QuestionInput & { id: string })[];
  durationMinutes: number;
  createdAt: string;
};

export type AssessmentInput = {
  title: string;
  guidelines: string;
  aiPolicy: AiPolicy;
  criteria: string[];
  antiCheat: string[];
  questions: QuestionInput[];
  durationMinutes?: number;
  /** 마지막으로 불러온 revision. 다른 선생님이 먼저 고쳤으면 409 ASSESSMENT_REVISION_CONFLICT가 옵니다. */
  revision?: number;
};

export type AssessmentCollaborator = {
  userId: string;
  teacherId: string;
  name: string;
  email: string;
  role: "EDITOR";
  sharedAt: string;
};

export type AssessmentScope = "mine" | "shared" | "all";

const idPath = (id: string) => encodeURIComponent(id);
const base = "/api/teacher/assessments";

export const createAssessment = (payload: AssessmentInput) =>
  apiRequest<Assessment>(base, { method: "POST", body: payload });

export const getAssessments = (page = 0, size = 100, scope: AssessmentScope = "all") =>
  apiRequest<PageResponse<AssessmentSummary>>(
    `${base}?${new URLSearchParams({ page: String(page), size: String(size), scope })}`,
  );

export const getAssessment = (assessmentId: string) =>
  apiRequest<Assessment>(`${base}/${idPath(assessmentId)}`);

export const updateAssessment = (assessmentId: string, payload: AssessmentInput) =>
  apiRequest<Assessment>(`${base}/${idPath(assessmentId)}`, {
    method: "PUT",
    body: payload,
  });

export const deleteAssessment = (assessmentId: string) =>
  apiRequest<void>(`${base}/${idPath(assessmentId)}`, { method: "DELETE" });

export const createAssessmentClass = (assessmentId: string, className: string) =>
  apiRequest<AssessmentClass>(`${base}/${idPath(assessmentId)}/classes`, {
    method: "POST",
    body: { className },
  });

// 반 이름 수정(시작 전·진행 중·종료 모두 가능). 같은 수행평가 안에서 이름이 겹치면 409 CLASS_NAME_TAKEN.
export const renameAssessmentClass = (
  assessmentId: string,
  classId: string,
  className: string,
) =>
  apiRequest<AssessmentClass>(`${base}/${idPath(assessmentId)}/classes/${idPath(classId)}`, {
    method: "PATCH",
    body: { className },
  });

export const deleteAssessmentClass = (assessmentId: string, classId: string) =>
  apiRequest<void>(`${base}/${idPath(assessmentId)}/classes/${idPath(classId)}`, {
    method: "DELETE",
  });

// 시작할 때 6자리 PIN과 QR이 발급됩니다. 참여자가 0명이어도 시작할 수 있고, 시작 후 늦게 입장해도 됩니다.
export const startAssessmentClass = (
  assessmentId: string,
  classId: string,
  expiresInMinutes: number,
) =>
  apiRequest<AssessmentClass>(
    `${base}/${idPath(assessmentId)}/classes/${idPath(classId)}/start`,
    { method: "POST", body: { expiresInMinutes } },
  );

// 대기실 열기: PIN·QR만 발급하고 WAITING을 유지합니다. 학생은 들어와 기다리고, 타이머는 /start에서 시작합니다.
// 이미 열린 대기실에 다시 보내면 PIN·참가자·유효시간이 유지되고, 만료된 대기실은 같은 PIN으로 다시 열립니다.
export const openAssessmentClassLobby = (
  assessmentId: string,
  classId: string,
  expiresInMinutes = 60,
) =>
  apiRequest<AssessmentClass>(
    `${base}/${idPath(assessmentId)}/classes/${idPath(classId)}/lobby`,
    { method: "POST", body: { expiresInMinutes } },
  );

export const endAssessmentClass = (assessmentId: string, classId: string) =>
  apiRequest<AssessmentClass>(
    `${base}/${idPath(assessmentId)}/classes/${idPath(classId)}/end`,
    { method: "POST" },
  );

// 공유(공동 편집) 관리. 추가·타인 해제는 OWNER만, EDITOR는 본인 userId로 DELETE해 공유에서 나갑니다.
export const getCollaborators = (assessmentId: string) =>
  apiRequest<AssessmentCollaborator[]>(`${base}/${idPath(assessmentId)}/collaborators`);

export const addCollaborator = (assessmentId: string, email: string) =>
  apiRequest<AssessmentCollaborator>(`${base}/${idPath(assessmentId)}/collaborators`, {
    method: "POST",
    body: { email, role: "EDITOR" },
  });

export const removeCollaborator = (assessmentId: string, teacherId: string) =>
  apiRequest<void>(`${base}/${idPath(assessmentId)}/collaborators/${idPath(teacherId)}`, {
    method: "DELETE",
  });
