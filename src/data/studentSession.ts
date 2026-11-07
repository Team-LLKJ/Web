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

// 탭을 닫아도 PIN 없이 다시 들어올 수 있도록 같은 토큰을 브라우저에도 한 벌 남겨 둡니다(재접속 API용).
const RECONNECT_KEY = "lit:student:reconnect";

export function saveParticipantCredentials(participantToken: string, evaluationId: string) {
  try {
    sessionStorage.setItem(PARTICIPANT_TOKEN_KEY, participantToken);
    sessionStorage.setItem(PARTICIPANT_EVALUATION_ID_KEY, evaluationId);
  } catch {
    // The participant must rejoin if this tab cannot retain its credential.
  }
  try {
    localStorage.setItem(RECONNECT_KEY, JSON.stringify({ evaluationId, participantToken }));
  } catch {
    // Reconnecting after closing the tab is a convenience only.
  }
}

/** 탭을 닫았다 열어도 남아 있는 재접속 정보. */
export function getReconnectCredentials(): { evaluationId: string; participantToken: string } | null {
  try {
    const value = JSON.parse(localStorage.getItem(RECONNECT_KEY) || "null");
    if (!value || typeof value.evaluationId !== "string" || typeof value.participantToken !== "string") return null;
    return { evaluationId: value.evaluationId, participantToken: value.participantToken };
  } catch {
    return null;
  }
}

export function getParticipantToken(evaluationId?: string) {
  try {
    const token = sessionStorage.getItem(PARTICIPANT_TOKEN_KEY);
    const storedEvaluationId = sessionStorage.getItem(PARTICIPANT_EVALUATION_ID_KEY);
    if (token && storedEvaluationId && (!evaluationId || storedEvaluationId === evaluationId)) return token;
  } catch {
    // Fall back to the reconnect copy below.
  }
  const saved = getReconnectCredentials();
  if (!saved || (evaluationId && saved.evaluationId !== evaluationId)) return null;
  return saved.participantToken;
}

// 제출 완료 화면에서 본인 리포트를 받을 때만 쓰는 정보. 탭을 닫으면 사라집니다.
const REPORT_KEY = "lit:student:report";
export type ReportCredentials = { evaluationId: string; participantToken: string; title: string; nickname: string };

export function saveReportCredentials(value: ReportCredentials) {
  try {
    sessionStorage.setItem(REPORT_KEY, JSON.stringify(value));
  } catch {
    // The report download is optional.
  }
}

export function readReportCredentials(): ReportCredentials | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(REPORT_KEY) || "null");
    if (!value || typeof value.evaluationId !== "string" || typeof value.participantToken !== "string") return null;
    return {
      evaluationId: value.evaluationId,
      participantToken: value.participantToken,
      title: typeof value.title === "string" ? value.title : "",
      nickname: typeof value.nickname === "string" ? value.nickname : "",
    };
  } catch {
    return null;
  }
}

export function clearReportCredentials() {
  try {
    sessionStorage.removeItem(REPORT_KEY);
  } catch {
    // Ignore disabled browser storage.
  }
}

export function clearParticipantCredentials() {
  try {
    sessionStorage.removeItem(PARTICIPANT_TOKEN_KEY);
    sessionStorage.removeItem(PARTICIPANT_EVALUATION_ID_KEY);
  } catch {
    // Ignore disabled browser storage.
  }
  try {
    localStorage.removeItem(RECONNECT_KEY);
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

