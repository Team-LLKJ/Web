import type { Message } from "./grading";
export type StudentSession = {
  pin: string;
  nickname: string;
  answers: Record<number, string>;
  messages: Message[];
  submittedAt: string | null;
};
export const emptySession: StudentSession = {
  pin: "",
  nickname: "",
  answers: {},
  messages: [],
  submittedAt: null,
};
export function readSession(): StudentSession {
  try {
    const value = JSON.parse(
      localStorage.getItem("lit:student-session") || "null",
    );
    if (
      !value ||
      typeof value.pin !== "string" ||
      typeof value.nickname !== "string"
    )
      return emptySession;
    return {
      ...emptySession,
      ...value,
      answers:
        value.answers && typeof value.answers === "object" ? value.answers : {},
      messages: Array.isArray(value.messages) ? value.messages : [],
    };
  } catch {
    return emptySession;
  }
}
export function saveSession(session: StudentSession) {
  try {
    localStorage.setItem("lit:student-session", JSON.stringify(session));
  } catch {
    /* Storage can be unavailable in private browser sessions. */
  }
}
