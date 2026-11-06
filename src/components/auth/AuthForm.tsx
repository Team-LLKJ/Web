import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, apiErrorMessage } from "../../api/client";
import { checkUsernameAvailable, confirmEmailVerification, sendEmailVerification } from "../../api/auth";
import type { LoginRequest, TeacherSignup } from "../../api/types";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";
import "./auth-email.css";
import { SignupConsent } from "./SignupConsent";
import {
  EMPTY_CONSENT,
  isConsentComplete,
  type ConsentState,
} from "./signupConsentItems";

export type AuthFormPayload = LoginRequest | TeacherSignup;

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
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(EMPTY_CONSENT);
  const isLogin = mode === "login";
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
      setNotice("올바른 이메일 주소를 입력해주세요.");
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
      setNotice(apiErrorMessage(error, "인증번호를 보내지 못했습니다."));
    } finally {
      setEmailBusy(null);
    }
  }

  async function confirmCode() {
    setNotice("");
    if (!/^[0-9]{6}$/.test(code)) {
      setNotice("인증번호 6자리를 입력해주세요.");
      return;
    }
    setEmailBusy("confirm");
    try {
      const result = await confirmEmailVerification(email.trim(), code);
      setEmailToken(result.emailVerificationToken);
      setVerifiedEmail(email.trim().toLowerCase());
      setNotice("이메일 인증이 완료됐어요.");
    } catch (error) {
      setNotice(apiErrorMessage(error, "인증번호를 확인하지 못했습니다."));
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
      setNotice("이메일 인증을 먼저 완료해주세요.");
      return;
    }
    if (!name.trim() || name.trim().length > 50) {
      setNotice("이름을 50자 이내로 입력해주세요.");
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
    setBusy(true);
    try {
      const result = await checkUsernameAvailable(username.trim());
      if (!result.available) {
        setNotice("이미 사용 중인 아이디입니다.");
        return;
      }
    } catch (error) {
      setNotice(apiErrorMessage(error, "아이디를 확인하지 못했습니다."));
      return;
    } finally {
      setBusy(false);
    }
    await completeSignup();
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
        {!isLogin && (
          <>
          <TextInput
            id="signup-email"
            label="이메일"
            floatingLabel
            variant="under-bar"
            type="email"
            autoComplete="email"
            placeholder="이메일을 입력해주세요"
            value={email}
            disabled={busy || emailVerified}
            onChange={(event) => { setEmail(event.target.value); setCodeSent(false); setNotice(""); }}
            trailingAction={
              <button
                type="button"
                className={`auth-inline-action${emailVerified ? " is-verified" : ""}`}
                disabled={busy || emailBusy !== null || emailVerified || resendIn > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void sendCode()}
              >
                {emailBusy === "send" && <span className="auth-dots" aria-hidden="true"><span /><span /><span /></span>}
                {emailVerified ? "인증 완료" : resendIn > 0 ? `재발송 ${resendIn}초` : codeSent ? "다시 보내기" : "인증하기"}
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
                  {emailBusy === "confirm" && <span className="auth-dots" aria-hidden="true"><span /><span /><span /></span>}
                  확인
                </button>
              }
            />
          )}
          <TextInput id="signup-name" label="이름" floatingLabel variant="under-bar" autoComplete="name" placeholder="이름을 입력해주세요" value={name} disabled={busy} onChange={(event) => { setName(event.target.value); setNotice(""); }} />
          </>
        )}
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
            disabled={consentMissing}
            loading={busy}
          >
            {isLogin ? "로그인" : "회원가입"}
          </Button>
        </div>
        {notice && <p className="auth-notice" role="alert">{notice}</p>}
      </div>
    </form>
  );
}
