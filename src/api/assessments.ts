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

export type AssessmentSummary = {
  id: string;
  title: string;
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
};

const idPath = (id: string) => encodeURIComponent(id);
const base = "/api/teacher/assessments";

export const createAssessment = (payload: AssessmentInput) =>
  apiRequest<Assessment>(base, { method: "POST", body: payload });

export const getAssessments = (page = 0, size = 100) =>
  apiRequest<PageResponse<AssessmentSummary>>(
    `${base}?${new URLSearchParams({ page: String(page), size: String(size) })}`,
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

export const deleteAssessmentClass = (assessmentId: string, classId: string) =>
  apiRequest<void>(`${base}/${idPath(assessmentId)}/classes/${idPath(classId)}`, {
    method: "DELETE",
  });

export const startAssessmentClass = (
  assessmentId: string,
  classId: string,
  expiresInMinutes: number,
) =>
  apiRequest<AssessmentClass>(
    `${base}/${idPath(assessmentId)}/classes/${idPath(classId)}/start`,
    { method: "POST", body: { expiresInMinutes } },
  );

export const endAssessmentClass = (assessmentId: string, classId: string) =>
  apiRequest<AssessmentClass>(
    `${base}/${idPath(assessmentId)}/classes/${idPath(classId)}/end`,
    { method: "POST" },
  );
