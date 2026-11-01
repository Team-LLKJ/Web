export type StudentSession = {
  pin: string;
  evaluationId: string;
  evaluationTitle: string;
  nickname: string;
  participantId: string;
};

export const emptySession: StudentSession = {
  pin: "",
  evaluationId: "",
  evaluationTitle: "",
  nickname: "",
  participantId: "",
};

const STORAGE_KEY = "lit:student-session";
const PARTICIPANT_TOKEN_KEY = "lit:student:participant-token";
const PARTICIPANT_EVALUATION_ID_KEY = "lit:student:evaluation-id";

export function saveParticipantCredentials(participantToken: string, evaluationId: string) {
  try {
    sessionStorage.setItem(PARTICIPANT_TOKEN_KEY, participantToken);
    sessionStorage.setItem(PARTICIPANT_EVALUATION_ID_KEY, evaluationId);
  } catch {
    // The participant must rejoin if this tab cannot retain its credential.
  }
}

export function getParticipantToken(evaluationId?: string) {
  try {
    const token = sessionStorage.getItem(PARTICIPANT_TOKEN_KEY);
    const storedEvaluationId = sessionStorage.getItem(PARTICIPANT_EVALUATION_ID_KEY);
    if (!token || !storedEvaluationId || (evaluationId && storedEvaluationId !== evaluationId)) return null;
    return token;
  } catch {
    return null;
  }
}

export function clearParticipantCredentials() {
  try {
    sessionStorage.removeItem(PARTICIPANT_TOKEN_KEY);
    sessionStorage.removeItem(PARTICIPANT_EVALUATION_ID_KEY);
  } catch {
    // Ignore disabled browser storage.
  }
}

export function readSession(): StudentSession {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!value || typeof value.pin !== "string" || typeof value.evaluationId !== "string") return emptySession;
    return {
      ...emptySession,
      pin: value.pin,
      evaluationId: value.evaluationId,
      evaluationTitle: typeof value.evaluationTitle === "string" ? value.evaluationTitle : "",
      nickname: typeof value.nickname === "string" ? value.nickname : "",
      participantId: typeof value.participantId === "string" ? value.participantId : "",
    };
  } catch {
    return emptySession;
  }
}

export function saveSession(session: StudentSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The API remains authoritative when browser storage is unavailable.
  }
}

export function clearSession() {
  clearParticipantCredentials();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore disabled browser storage.
  }
}

