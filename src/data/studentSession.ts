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
const DRAFT_KEY_PREFIX = "lit:student:draft:";
const LAST_QUESTION_KEY_PREFIX = "lit:student:last-question:";

export type AnswerDraft = {
  content: string;
  /** 이 초안을 쓰기 시작할 때의 서버 답안 버전. 서버 버전과 다르면 충돌로 봅니다. */
  baseVersion: number;
};

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

// 제출 완료 화면에 보여줄 이름과 평가 제목. 제출 뒤에는 토큰을 남기지 않습니다(학생은 제출 후 평가와 기록을 볼 수 없음).
const SUBMITTED_KEY = "lit:student:submitted";
export type SubmittedInfo = {
  title: string;
  nickname: string;
  /** 학생이 직접 제출하지 않고 평가가 끝나서(교사 종료·시간 종료) 나온 경우 */
  ended?: boolean;
  /** 평가가 끝났을 때 답안 제출까지 확인됐는지 */
  submitted?: boolean;
};

export function saveSubmittedInfo(value: SubmittedInfo) {
  try {
    sessionStorage.setItem(SUBMITTED_KEY, JSON.stringify(value));
  } catch {
    // 완료 화면 안내용이라 저장에 실패해도 괜찮습니다.
  }
}

export function readSubmittedInfo(): SubmittedInfo | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SUBMITTED_KEY) || "null");
    if (!value || typeof value !== "object") return null;
    return {
      title: typeof value.title === "string" ? value.title : "",
      nickname: typeof value.nickname === "string" ? value.nickname : "",
      ended: value.ended === true,
      submitted: value.submitted !== false,
    };
  } catch {
    return null;
  }
}

export function clearSubmittedInfo() {
  try {
    sessionStorage.removeItem(SUBMITTED_KEY);
    // 예전 버전이 남긴 리포트용 토큰도 지웁니다.
    sessionStorage.removeItem("lit:student:report");
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

const draftKey = (evaluationId: string, questionId: string) =>
  `${DRAFT_KEY_PREFIX}${evaluationId}:${questionId}`;

/** 저장 공간이 부족하거나 저장소를 쓸 수 없으면 false를 돌려줍니다. */
export function saveAnswerDraft(evaluationId: string, questionId: string, draft: AnswerDraft) {
  try {
    localStorage.setItem(draftKey(evaluationId, questionId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function readAnswerDraft(evaluationId: string, questionId: string): AnswerDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(draftKey(evaluationId, questionId)) || "null");
    if (!value || typeof value.content !== "string" || typeof value.baseVersion !== "number") return null;
    return { content: value.content, baseVersion: value.baseVersion };
  } catch {
    return null;
  }
}

export function removeAnswerDraft(evaluationId: string, questionId: string) {
  try {
    localStorage.removeItem(draftKey(evaluationId, questionId));
  } catch {
    // Ignore disabled browser storage.
  }
}

export function saveLastQuestion(evaluationId: string, questionId: string) {
  try {
    localStorage.setItem(`${LAST_QUESTION_KEY_PREFIX}${evaluationId}`, questionId);
  } catch {
    // The student simply returns to the guide if this cannot be stored.
  }
}

export function readLastQuestion(evaluationId: string) {
  try {
    return localStorage.getItem(`${LAST_QUESTION_KEY_PREFIX}${evaluationId}`);
  } catch {
    return null;
  }
}

/** evaluationId를 생략하면 모든 평가의 초안을 지웁니다. */
export function clearAnswerDrafts(evaluationId = "") {
  try {
    const prefixes = [
      `${DRAFT_KEY_PREFIX}${evaluationId}`,
      `${LAST_QUESTION_KEY_PREFIX}${evaluationId}`,
    ];
    Object.keys(localStorage)
      .filter((key) => prefixes.some((prefix) => key.startsWith(prefix)))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore disabled browser storage.
  }
}

export function clearSession() {
  clearParticipantCredentials();
  clearAnswerDrafts();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore disabled browser storage.
  }
}

