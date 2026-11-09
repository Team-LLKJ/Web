import { ApiError, apiRequest, clearTokens, setTokens } from "./client";
import type {
  ApiMessage,
  Consents,
  EmailVerificationConfirmed,
  EmailVerificationSent,
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
    throw new ApiError(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 일치하지 않습니다.");
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

/** 로그인 전에 가입 화면에서 쓰는 현재 약관·개인정보 처리방침 버전. */
export function getCurrentPolicies() {
  return apiRequest<{ termsVersion: string; privacyVersion: string }>(
    "/api/policies/current",
    { auth: false },
  );
}

export async function signupTeacher(payload: TeacherSignup) {
  // 새 서버는 가입 요청에 약관 동의 버전을 함께 받습니다. 아직 지원하지 않는 서버면 기존 본문 그대로 보냅니다.
  const policies = await getCurrentPolicies().catch(() => null);
  return apiRequest<User>("/api/auth/signup/teacher", {
    method: "POST",
    body: policies
      ? {
          ...payload,
          termsVersion: policies.termsVersion,
          termsAccepted: true,
          privacyVersion: policies.privacyVersion,
          privacyAccepted: true,
        }
      : payload,
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


// 내 정보. 이름 수정과 비밀번호 변경(다른 기기의 로그인은 서버가 해제합니다).
export function updateMyName(name: string) {
  return apiRequest<User>("/api/users/me/nickname", { method: "PATCH", body: { nickname: name } });
}

export function changeMyPassword(currentPassword: string, newPassword: string) {
  return apiRequest<ApiMessage>("/api/users/me/password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

// 회원가입 도우미(공개 API): 아이디 중복 확인과 이메일 인증번호 발송·확인.
export function checkUsernameAvailable(username: string) {
  return apiRequest<{ username: string; available: boolean }>(
    `/api/auth/username-availability?${new URLSearchParams({ username })}`,
    { auth: false },
  );
}

export function sendEmailVerification(email: string) {
  return apiRequest<EmailVerificationSent>("/api/auth/email-verifications", {
    method: "POST",
    body: { email },
    auth: false,
  });
}

export function confirmEmailVerification(email: string, code: string) {
  return apiRequest<EmailVerificationConfirmed>("/api/auth/email-verifications/confirm", {
    method: "POST",
    body: { email, code },
    auth: false,
  });
}

// 이용약관·개인정보 처리방침 동의(로그인한 교사).
export function getConsents() {
  return apiRequest<Consents>("/api/users/me/consents");
}

export function acceptConsents(termsVersion: string, privacyVersion: string) {
  return apiRequest<Consents>("/api/users/me/consents", {
    method: "POST",
    body: { termsVersion, termsAccepted: true, privacyVersion, privacyAccepted: true },
  });
}

// 이메일 변경: 새 주소로 인증번호를 보낸 뒤(현재 비밀번호 필요) 번호로 확인합니다.
export function sendEmailChangeVerification(email: string, currentPassword: string) {
  return apiRequest<EmailVerificationSent>("/api/users/me/email/verifications", {
    method: "POST",
    body: { email, currentPassword },
  });
}

export function confirmEmailChange(email: string, currentPassword: string, code: string) {
  return apiRequest<User>("/api/users/me/email/confirm", {
    method: "POST",
    body: { email, currentPassword, code },
  });
}

// 회원 탈퇴: 본인 소유 수행평가·학생 기록이 영구 삭제됩니다. 진행 중인 평가가 있으면 409입니다.
export function deleteMyAccount(currentPassword: string) {
  return apiRequest<ApiMessage>("/api/users/me", {
    method: "DELETE",
    body: { currentPassword, deleteOwnedData: true },
  });
}

export type ConsentHistoryItem = { policyType: string; version: string; acceptedAt: string };

export function getConsentHistory() {
  return apiRequest<{ items: ConsentHistoryItem[] }>("/api/users/me/consents/history");
}
