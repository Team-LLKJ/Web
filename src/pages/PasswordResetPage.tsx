import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { confirmPasswordReset } from "../api/auth";
import { apiErrorMessage } from "../api/client";
import { AuthLayout } from "../components/auth/AuthLayout";
import { PasswordVisibilityButton } from "../components/auth/PasswordVisibilityButton";
import { Button } from "../components/ui/Button";
import { TextInput } from "../components/ui/TextInput";
import {
  NEW_PASSWORD_HINT,
  NEW_PASSWORD_MAX,
  PASSWORD_MIN,
  checkNewPassword,
} from "../lib/passwordRules";

export function PasswordResetPage() {
  const token = useMemo(() => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "", []);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNoticeText] = useState("");
  // 실패 문구만 빨간색으로 보여주고, 변경 완료 안내는 기본 색으로 둡니다.
  const [noticeIsError, setNoticeIsError] = useState(true);
  const setNotice = (message: string, isError = true) => {
    setNoticeText(message);
    setNoticeIsError(isError);
  };
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (!token) {
      setNotice("메일에 있는 재설정 링크를 다시 열어주세요.");
      return;
    }
    const passwordProblem = checkNewPassword(password);
    if (passwordProblem) {
      setNotice(passwordProblem);
      return;
    }
    if (password !== confirmation) {
      setNotice("비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    try {
      const result = await confirmPasswordReset(token, password);
      setNotice(result.message, false);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      setTimeout(() => navigate("/login", { replace: true, state: { notice: result.message } }), 900);
    } catch (error) {
      setNotice(apiErrorMessage(error, "비밀번호를 변경하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout mode="login">
      <form className="auth-form" noValidate onSubmit={(event) => void submit(event)}>
        <h1>새 비밀번호 설정</h1>
        <div className="auth-fields">
          <TextInput
            label="새 비밀번호"
            floatingLabel
            variant="under-bar"
            placeholder={NEW_PASSWORD_HINT}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            maxLength={NEW_PASSWORD_MAX}
            value={password}
            disabled={busy}
            onChange={(event) => { setPassword(event.target.value); setNotice(""); }}
            trailingAction={<PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} />}
          />
          <TextInput
            label="새 비밀번호 확인"
            floatingLabel
            variant="under-bar"
            placeholder="새 비밀번호 확인"
            type={showConfirmation ? "text" : "password"}
            autoComplete="new-password"
            maxLength={NEW_PASSWORD_MAX}
            value={confirmation}
            disabled={busy}
            onChange={(event) => { setConfirmation(event.target.value); setNotice(""); }}
            trailingAction={<PasswordVisibilityButton visible={showConfirmation} onToggle={() => setShowConfirmation((visible) => !visible)} />}
          />
        </div>
        <div className="auth-submit">
          <div className="auth-submit-actions">
            <Button type="submit" size="large" loading={busy}>{busy ? "변경 중…" : "비밀번호 변경"}</Button>
          </div>
          {notice && <p className={`auth-notice${noticeIsError ? " auth-notice--error" : ""}`} role="status">{notice}</p>}
          {!token && <Link className="reset-retry-link" to="/login">로그인으로 돌아가기</Link>}
        </div>
      </form>
    </AuthLayout>
  );
}

