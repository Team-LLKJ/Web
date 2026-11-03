import { ApiError, apiRequest, clearTokens, setTokens } from "./client";
import type {
  ApiMessage,
  LoginRequest,
  StudentSignup,
  TeacherInvitation,
  TeacherSignup,
  Tokens,
  User,
} from "./types";

export async function login(credentials: LoginRequest) {
  const tokens = await apiRequest<Tokens>("/api/auth/login", {
    method: "POST",
    body: credentials,
    auth: false,
  });
  if (tokens.user.role !== "TEACHER") {
    clearTokens();
    throw new ApiError(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호를 확인해주세요.");
  }
  setTokens(tokens);
  return tokens.user;
}

export function signupStudent(payload: StudentSignup) {
  return apiRequest<User>("/api/auth/signup/student", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function signupTeacher(payload: TeacherSignup) {
  return apiRequest<User>("/api/auth/signup/teacher", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function getCurrentUser() {
  return apiRequest<User>("/api/auth/me");
}

export async function logout() {
  try {
    await apiRequest<ApiMessage>("/api/auth/logout", { method: "POST" });
  } finally {
    clearTokens();
  }
}

// 내 정보. 이름 수정.
export function updateMyName(name: string) {
  return apiRequest<User>("/api/users/me", { method: "PATCH", body: { name } });
}

export function createTeacherInvitation(expiresInHours: number) {
  return apiRequest<TeacherInvitation>("/api/auth/teacher-invitations", {
    method: "POST",
    body: { expiresInHours },
  });
}

export function requestPasswordReset(email: string) {
  return apiRequest<ApiMessage>("/api/auth/password-reset/request", {
    method: "POST",
    body: { email },
    auth: false,
  });
}

export function confirmPasswordReset(token: string, newPassword: string) {
  return apiRequest<ApiMessage>("/api/auth/password-reset/confirm", {
    method: "POST",
    body: { token, newPassword },
    auth: false,
  });
}

