import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, apiErrorMessage } from "../../api/client";
import type { LoginRequest, StudentSignup, TeacherSignup, UserRole } from "../../api/types";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { SignupConsent } from "./SignupConsent";
import {
  EMPTY_CONSENT,
  isConsentComplete,
  type ConsentState,
} from "./signupConsentItems";

export type AuthFormPayload = LoginRequest | StudentSignup | TeacherSignup;

type Props = {
  mode: "login" | "signup";
  onSubmit: (payload: AuthFormPayload) => Promise<void>;
};

function loginErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return "아이디 또는 비밀번호를 확인해주세요.";
      case "INVALID_REQUEST":
        return "아이디와 비밀번호를 확인해주세요.";
      case "RATE_LIMITED":
        return "로그인 시도가 제한되었습니다. 잠시 후 다시 시도해주세요.";
    }
    if ([502, 503, 504].includes(error.status)) {
      return "로그인 서버에 연결할 수 없습니다. 서버 주소와 실행 상태를 확인해주세요.";
    }
  }
  return apiErrorMessage(error, "로그인에 실패했습니다.");
}

export function AuthForm({ mode, onSubmit }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("1");
  const [classNumber, setClassNumber] = useState("1");
  const [studentNumber, setStudentNumber] = useState("1");
  const [inviteCode, setInviteCode] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(EMPTY_CONSENT);
  const isLogin = mode === "login";
  const consentMissing = !isLogin && !isConsentComplete(consent);

  useEffect(() => {
    if (!isLogin) return;
    const form = formRef.current;
    if (!form) return;

    const syncBrowserCredentials = () => {
      const formData = new FormData(form);
      const savedUsername = String(formData.get("username") ?? "");
      const savedPassword = String(formData.get("password") ?? "");
      if (savedUsername) setUsername((current) => current || savedUsername);
      if (savedPassword) setPassword((current) => current || savedPassword);
    };

    const initialSync = window.setTimeout(syncBrowserCredentials, 0);
    const interval = window.setInterval(syncBrowserCredentials, 100);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 2000);
    form.addEventListener("input", syncBrowserCredentials, true);
    form.addEventListener("change", syncBrowserCredentials, true);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      window.clearTimeout(initialSync);
      form.removeEventListener("input", syncBrowserCredentials, true);
      form.removeEventListener("change", syncBrowserCredentials, true);
    };
  }, [isLogin]);

  async function completeSignup() {
    setNotice("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setNotice("올바른 이메일 주소를 입력해주세요.");
      return;
    }
    if (!name.trim() || name.trim().length > 50 || !school.trim() || school.trim().length > 100) {
      setNotice("이름과 학교를 확인해주세요. 이름은 50자, 학교는 100자 이내입니다.");
      return;
    }
    if (role === "TEACHER" && (inviteCode.trim().length < 32 || inviteCode.trim().length > 128)) {
      setNotice("유효한 교사 초대 코드를 입력해주세요.");
      return;
    }
    if (role === "STUDENT") {
      const numbers = [Number(grade), Number(classNumber), Number(studentNumber)];
      if (!Number.isInteger(numbers[0]) || numbers[0] < 1 || numbers[0] > 12
        || !Number.isInteger(numbers[1]) || numbers[1] < 1 || numbers[1] > 99
        || !Number.isInteger(numbers[2]) || numbers[2] < 1 || numbers[2] > 999) {
        setNotice("학년, 반, 번호를 확인해주세요.");
        return;
      }
    }

    const common = { username: username.trim(), password, email: email.trim(), name: name.trim(), school: school.trim() };
    const payload: StudentSignup | TeacherSignup = role === "STUDENT"
      ? { ...common, grade: Number(grade), classNumber: Number(classNumber), studentNumber: Number(studentNumber) }
      : { ...common, inviteCode: inviteCode.trim() };
    setBusy(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      setNotice(apiErrorMessage(error, "회원가입에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const formData = new FormData(event.currentTarget);
    const submittedUsername = isLogin
      ? String(formData.get("username") ?? username)
      : username;
    const submittedPassword = isLogin
      ? String(formData.get("password") ?? password)
      : password;

    if (!submittedUsername.trim() || !submittedPassword) {
      setNotice("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    if (isLogin) {
      if (submittedUsername.trim().length > 100 || submittedPassword.length > 128) {
        setNotice("아이디는 100자, 비밀번호는 128자 이내로 입력해주세요.");
        return;
      }
      setUsername(submittedUsername);
      setPassword(submittedPassword);
      setBusy(true);
      try {
        await onSubmit({ username: submittedUsername.trim().toLowerCase(), password: submittedPassword });
      } catch (error) {
        setNotice(loginErrorMessage(error));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (signupStep === 2) {
      await completeSignup();
      return;
    }
    if (consentMissing) {
      setNotice("필수 약관에 모두 동의해주세요.");
      return;
    }
    if (!/^[A-Za-z0-9_]{4,30}$/.test(username.trim())) {
      setNotice("아이디는 영문, 숫자, 밑줄을 사용해 4~30자로 입력해주세요.");
      return;
    }
    if (password.length < 10 || password.length > 128 || /\s/.test(password)) {
      setNotice("비밀번호는 공백 없이 10~128자로 입력해주세요.");
      return;
    }
    setSignupStep(2);
  }

  return (
    <form ref={formRef} className={`auth-form auth-form--${mode}`} noValidate onSubmit={(event) => void submit(event)}>
      <h1>{isLogin ? "로그인" : "회원가입"}</h1>
      <div className="auth-fields">
        <TextInput
          id={`${mode}-username`}
          name="username"
          label="아이디"
          floatingLabel
          variant="under-bar"
          placeholder="아이디"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={isLogin ? 100 : 30}
          {...(isLogin ? {} : { value: username })}
          {...(isLogin ? { inputRef: usernameInputRef, className: username ? "text-input-field--filled" : "" } : {})}
          required
          disabled={busy}
          onChange={(event) => { setUsername(event.target.value); setNotice(""); }}
          trailingAction={isLogin ? (
            <button
              className="auth-input-action auth-clear-action"
              type="button"
              aria-label="아이디 지우기"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (usernameInputRef.current) usernameInputRef.current.value = "";
                setUsername("");
                setNotice("");
              }}
            >
              ×
            </button>
          ) : undefined}
        />
        <div className="auth-password-field">
          <TextInput
            id={`${mode}-password`}
            name="password"
            label="비밀번호"
            floatingLabel
            variant="under-bar"
            type={isLogin && showPassword ? "text" : "password"}
            placeholder="비밀번호"
            autoComplete={isLogin ? "current-password" : "new-password"}
            maxLength={128}
            {...(isLogin ? {} : { value: password })}
            {...(isLogin ? { className: password ? "text-input-field--filled" : "" } : {})}
            required
            disabled={busy}
            onChange={(event) => { setPassword(event.target.value); setNotice(""); }}
            trailingAction={isLogin ? (
              <button
                className="auth-input-action auth-password-action"
                type="button"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                aria-pressed={showPassword}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {showPassword ? (
                    <>
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  ) : (
                    <>
                      <path d="m3 3 18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 5.1A11.5 11.5 0 0 1 12 5c6.4 0 10 7 10 7a14.7 14.7 0 0 1-3.3 4.1" />
                      <path d="M6.6 6.6C3.7 8.3 2 12 2 12s3.6 7 10 7a10.4 10.4 0 0 0 4.1-.8" />
                    </>
                  )}
                </svg>
              </button>
            ) : undefined}
          />
        </div>
      </div>
      {!isLogin && (
        <SignupConsent
          value={consent}
          disabled={busy}
          onChange={(next) => {
            setConsent(next);
            setNotice("");
          }}
        />
      )}
      <div className="auth-submit">
        <div className="auth-submit-actions">
          <Button
            type="submit"
            size="large"
            className={isLogin ? "auth-login-button" : ""}
            disabled={busy || consentMissing}
            aria-busy={isLogin ? busy : undefined}
          >
            {isLogin && busy && <span className="auth-loading-spinner" aria-hidden="true" />}
            {isLogin ? "로그인" : busy ? "처리 중…" : "회원가입"}
          </Button>
          {isLogin && (
            <Button
              variant="ghost"
              size="large"
              className="auth-google-button"
              disabled={busy}
              icon={<img src="/auth-assets/google-logo.png" alt="" width="22" height="23" />}
              onClick={() => setNotice("현재 API 명세에는 Google OAuth 로그인 경로가 없습니다.")}
            >
              Google로 시작하기
            </Button>
          )}
        </div>
        {notice && (isLogin || signupStep === 1) && <p className="auth-notice" role="alert">{notice}</p>}
      </div>
      {!isLogin && signupStep === 2 && (
        <Modal
          title="회원 정보 입력"
          className="signup-profile-modal"
          onClose={() => { if (!busy) { setNotice(""); setSignupStep(1); } }}
          actions={
            <>
              <Button loading={busy} onClick={() => void completeSignup()}>{busy ? "처리 중…" : "가입 완료"}</Button>
              <Button variant="secondary" disabled={busy} onClick={() => { setNotice(""); setSignupStep(1); }}>이전</Button>
            </>
          }
        >
          <div className="signup-profile-step">
            <p className="signup-account-summary"><span>{username} 계정으로 가입합니다</span></p>
            <p className="signup-profile-description">계정 생성에 필요한 정보를 입력해주세요.</p>
            <label className="auth-role-select">
              <span>계정 유형</span>
              <select value={role} disabled={busy} onChange={(event) => setRole(event.target.value as UserRole)}>
                <option value="STUDENT">학생</option>
                <option value="TEACHER">교사</option>
              </select>
            </label>
            <TextInput id="signup-email" label="이메일" floatingLabel variant="under-bar" type="email" autoComplete="email" placeholder="이메일을 입력해주세요" value={email} disabled={busy} onChange={(event) => { setEmail(event.target.value); setNotice(""); }} />
            <TextInput id="signup-name" label="이름" floatingLabel variant="under-bar" autoComplete="name" placeholder="이름을 입력해주세요" value={name} disabled={busy} onChange={(event) => { setName(event.target.value); setNotice(""); }} />
            <TextInput id="signup-school" label="학교" floatingLabel variant="under-bar" autoComplete="organization" placeholder="학교명을 입력해주세요" value={school} disabled={busy} onChange={(event) => { setSchool(event.target.value); setNotice(""); }} />
            {role === "STUDENT" ? (
              <div className="auth-number-fields">
                <TextInput id="signup-grade" label="학년" floatingLabel variant="under-bar" type="number" min={1} max={12} value={grade} disabled={busy} onChange={(event) => setGrade(event.target.value)} />
                <TextInput id="signup-class" label="반" floatingLabel variant="under-bar" type="number" min={1} max={99} value={classNumber} disabled={busy} onChange={(event) => setClassNumber(event.target.value)} />
                <TextInput id="signup-student-number" label="번호" floatingLabel variant="under-bar" type="number" min={1} max={999} value={studentNumber} disabled={busy} onChange={(event) => setStudentNumber(event.target.value)} />
              </div>
            ) : (
              <TextInput id="signup-invite-code" label="교사 초대 코드" floatingLabel variant="under-bar" autoComplete="off" placeholder="발급받은 초대 코드를 입력해주세요" value={inviteCode} disabled={busy} onChange={(event) => { setInviteCode(event.target.value); setNotice(""); }} />
            )}
            {notice && <p className="signup-profile-notice" role="alert">{notice}</p>}
          </div>
        </Modal>
      )}
    </form>
  );
}
