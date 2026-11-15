import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, apiErrorMessage } from "../../api/client";
import { checkUsernameAvailable, confirmEmailVerification, sendEmailVerification } from "../../api/auth";
import type { LoginRequest, TeacherSignup } from "../../api/types";
import { Button } from "../ui/Button";
import { PasswordResetRequest } from "./PasswordResetRequest";
import { PasswordVisibilityButton } from "./PasswordVisibilityButton";
import {
  NEW_PASSWORD_HINT,
  NEW_PASSWORD_MAX,
  PASSWORD_MAX,
  checkNewPassword,
  checkPasswordFormat,
} from "../../lib/passwordRules";
import { TextInput } from "../ui/TextInput";
import "./auth-email.css";
import {
  EMPTY_CONSENT,
  isConsentComplete,
  type ConsentState,
} from "./signupConsentItems";

// 약관 동의(약관 전문 포함)는 회원가입 2단계에서만 불러옵니다.
const SignupConsent = lazy(() =>
  import("./SignupConsent").then((module) => ({ default: module.SignupConsent })),
);

export type AuthFormPayload = LoginRequest | TeacherSignup;

type Props = {
  mode: "login" | "signup";
  onSubmit: (payload: AuthFormPayload) => Promise<void>;
};

function loginErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return "아이디 또는 비밀번호가 일치하지 않습니다.";
      case "INVALID_REQUEST":
        return "아이디 또는 비밀번호 형식이 올바르지 않습니다.";
      case "RATE_LIMITED":
        return "로그인 시도가 제한되었습니다. 잠시 후 다시 시도해주세요.";
    }
    if ([502, 503, 504].includes(error.status)) {
      return "서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.";
    }
  }
  return apiErrorMessage(error, "로그인에 실패했습니다.");
}

export function AuthForm({ mode, onSubmit }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [emailToken, setEmailToken] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [resendIn, setResendIn] = useState(0);
  // 인증번호 발송·확인 중 표시(회원가입 버튼과 따로 둡니다).
  const [emailBusy, setEmailBusy] = useState<"send" | "confirm" | null>(null);
  const [notice, setNoticeRaw] = useState("");
  // 입력칸에 해당하는 오류는 그 칸 바로 아래에 보여줍니다.
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const setNotice = (message: string) => {
    setNoticeRaw(message);
    if (!message) setFieldError(null);
  };
  const showFieldError = (field: string, message: string) => {
    setNoticeRaw("");
    setFieldError({ field, message });
  };
  const errorFor = (field: string) => (fieldError?.field === field ? fieldError.message : undefined);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(EMPTY_CONSENT);
  // 회원가입은 두 화면으로 나눕니다: 1) 계정 정보(아이디·비밀번호·이메일 인증) 2) 이름·약관 동의.
  const [step, setStep] = useState<1 | 2>(1);
  const isLogin = mode === "login";
  const signupStep = isLogin ? 0 : step;
  const consentMissing = !isLogin && !isConsentComplete(consent);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const emailVerified = Boolean(emailToken) && verifiedEmail === email.trim().toLowerCase();

  async function sendCode() {
    setNotice("");
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) {
      showFieldError("email", "올바른 이메일 주소를 입력해주세요.");
      return;
    }
    setEmailBusy("send");
    try {
      const result = await sendEmailVerification(value);
      setCodeSent(true);
      setCode("");
      setEmailToken("");
      setResendIn(result.resendAfterSeconds);
      setNotice("인증번호를 이메일로 보냈어요. 10분 안에 입력해주세요.");
    } catch (error) {
      showFieldError("email", apiErrorMessage(error, "인증번호를 보내지 못했습니다."));
    } finally {
      setEmailBusy(null);
    }
  }

  async function confirmCode() {
    setNotice("");
    if (!/^[0-9]{6}$/.test(code)) {
      showFieldError("code", "인증번호 6자리를 입력해주세요.");
      return;
    }
    setEmailBusy("confirm");
    try {
      const result = await confirmEmailVerification(email.trim(), code);
      setEmailToken(result.emailVerificationToken);
      setVerifiedEmail(email.trim().toLowerCase());
      setNotice("이메일 인증이 완료됐어요.");
    } catch (error) {
      showFieldError("code", apiErrorMessage(error, "인증번호를 확인하지 못했습니다."));
    } finally {
      setEmailBusy(null);
    }
  }

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
    if (!emailVerified) {
      showFieldError("email", "이메일 인증을 먼저 완료해주세요.");
      return;
    }
    if (!name.trim() || name.trim().length > 50) {
      showFieldError("name", "이름을 50자 이내로 입력해주세요.");
      return;
    }
    // 가입 요청 직전에도 비밀번호 규칙을 한 번 더 확인합니다.
    const passwordProblem = checkNewPassword(password);
    if (passwordProblem) {
      setStep(1);
      showFieldError("password", passwordProblem);
      return;
    }
    const payload: TeacherSignup = {
      username: username.trim(),
      password,
      email: email.trim(),
      name: name.trim(),
      emailVerificationToken: emailToken,
    };
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

    // 비어 있는 칸은 그 칸 아래에 "입력해주세요"로 알립니다(틀린 정보와 구분).
    if (!submittedUsername.trim()) {
      showFieldError("username", "아이디를 입력해주세요.");
      return;
    }
    if (!submittedPassword) {
      showFieldError("password", "비밀번호를 입력해주세요.");
      return;
    }
    if (isLogin) {
      if (submittedUsername.trim().length > 100) {
        showFieldError("username", "아이디는 100자 이내로 입력해주세요.");
        return;
      }
      const loginPasswordProblem = checkPasswordFormat(submittedPassword);
      if (loginPasswordProblem) {
        showFieldError("password", loginPasswordProblem);
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

    if (!/^[A-Za-z0-9_]{4,30}$/.test(username.trim())) {
      showFieldError("username", "아이디는 영문, 숫자, 밑줄을 사용해 4~30자로 입력해주세요.");
      return;
    }
    const passwordProblem = checkNewPassword(password);
    if (passwordProblem) {
      showFieldError("password", passwordProblem);
      return;
    }
    if (signupStep === 1) {
      if (!emailVerified) {
        showFieldError("email", "이메일 인증을 먼저 완료해주세요.");
        return;
      }
      setBusy(true);
      try {
        const result = await checkUsernameAvailable(username.trim());
        if (!result.available) {
          showFieldError("username", "이미 사용 중인 아이디입니다.");
          return;
        }
        setStep(2);
      } catch (error) {
        showFieldError("username", apiErrorMessage(error, "아이디를 확인하지 못했습니다."));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (consentMissing) {
      setNotice("필수 약관에 모두 동의해주세요.");
      return;
    }
    await completeSignup();
  }

  return (
    <form ref={formRef} className={`auth-form auth-form--${mode}`} noValidate onSubmit={(event) => void submit(event)}>
      {signupStep === 2 && (
        <button
          type="button"
          className="auth-step-back"
          onClick={() => {
            setNotice("");
            setStep(1);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          이전
        </button>
      )}
      <h1>{isLogin ? "로그인" : "회원가입"}</h1>
      <div className="auth-fields">
        {signupStep !== 2 && (<>
        <TextInput
          id={`${mode}-username`}
          name="username"
          label="아이디"
          floatingLabel
          variant="under-bar"
          placeholder={isLogin ? "아이디" : "영문·숫자·밑줄 4~30자"}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={isLogin ? 100 : 30}
          error={errorFor("username")}
          {...(isLogin ? {} : { value: username })}
          {...(isLogin ? { inputRef: usernameInputRef, className: username ? "text-input-field--filled" : "" } : {})}
          required
          disabled={busy}
          onChange={(event) => { setUsername(event.target.value); setNotice(""); }}
        />
        <div className="auth-password-field">
          <TextInput
            id={`${mode}-password`}
            name="password"
            label="비밀번호"
            floatingLabel
            variant="under-bar"
            type={showPassword ? "text" : "password"}
            placeholder={isLogin ? "비밀번호" : NEW_PASSWORD_HINT}
            autoComplete={isLogin ? "current-password" : "new-password"}
            maxLength={isLogin ? PASSWORD_MAX : NEW_PASSWORD_MAX}
            error={errorFor("password")}
            {...(isLogin ? {} : { value: password })}
            {...(isLogin ? { className: password ? "text-input-field--filled" : "" } : {})}
            required
            disabled={busy}
            onChange={(event) => { setPassword(event.target.value); setNotice(""); }}
            trailingAction={
              <PasswordVisibilityButton
                visible={showPassword}
                onToggle={() => setShowPassword((visible) => !visible)}
              />
            }
          />
        </div>
        {isLogin && <PasswordResetRequest />}
        </>)}
        {signupStep === 1 && (
          <>
          <TextInput
            id="signup-email"
            label="이메일"
            floatingLabel
            variant="under-bar"
            type="email"
            autoComplete="email"
            placeholder="이메일"
            value={email}
            error={errorFor("email")}
            disabled={busy || emailVerified}
            onChange={(event) => { setEmail(event.target.value); setCodeSent(false); setNotice(""); }}
            trailingAction={
              <button
                type="button"
                className={`auth-inline-action${emailVerified ? " is-verified" : ""}`}
                disabled={busy || emailBusy !== null || emailVerified || resendIn > 0}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void sendCode()}
              >
                {emailBusy === "send" ? (
                  <><span className="auth-dots" aria-hidden="true"><span /><span /><span /></span><span className="sr-only">인증번호 보내는 중</span></>
                ) : emailVerified ? "인증 완료" : resendIn > 0 ? `재발송 ${resendIn}초` : codeSent ? "다시 보내기" : "인증하기"}
              </button>
            }
          />
          {codeSent && !emailVerified && (
            <TextInput
              id="signup-email-code"
              label="인증번호"
              floatingLabel
              variant="under-bar"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6자리 숫자"
              value={code}
              error={errorFor("code")}
              disabled={busy}
              onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setNotice(""); }}
              trailingAction={
                <button
                  type="button"
                  className="auth-inline-action"
                  disabled={busy || emailBusy !== null || code.length !== 6}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void confirmCode()}
                >
                  {emailBusy === "confirm" ? (
                    <><span className="auth-dots" aria-hidden="true"><span /><span /><span /></span><span className="sr-only">인증번호 확인하는 중</span></>
                  ) : "확인"}
                </button>
              }
            />
          )}
          </>
        )}
        {signupStep === 2 && (
          <TextInput id="signup-name" label="이름" floatingLabel variant="under-bar" autoComplete="name" placeholder="이름을 입력해주세요" value={name} error={errorFor("name")} disabled={busy} onChange={(event) => { setName(event.target.value); setNotice(""); }} />
        )}
      </div>
      {signupStep === 2 && (
        <Suspense fallback={null}>
        <SignupConsent
          value={consent}
          disabled={busy}
          onChange={(next) => {
            setConsent(next);
            setNotice("");
          }}
        />
        </Suspense>
      )}
      <div className="auth-submit">
        <div className="auth-submit-actions">
          <Button
            type="submit"
            size="large"
            className={isLogin ? "auth-login-button" : ""}
            disabled={
              signupStep === 1
                ? !username.trim() || !password
                : signupStep === 2
                  ? consentMissing || !name.trim()
                  : false
            }
            loading={busy}
          >
            {isLogin ? "로그인" : signupStep === 1 ? "다음" : "회원가입"}
          </Button>
        </div>
        {notice && <p className={`auth-notice${isLogin ? " auth-notice--error" : ""}`} role="alert">{notice}</p>}
      </div>
    </form>
  );
}
