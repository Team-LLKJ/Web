import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { confirmPasswordReset } from "../api/auth";
import { apiErrorMessage } from "../api/client";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Button } from "../components/ui/Button";
import { TextInput } from "../components/ui/TextInput";

export function PasswordResetPage() {
  const token = useMemo(() => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "", []);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (!token) {
      setNotice("메일에 있는 재설정 링크를 다시 열어주세요.");
      return;
    }
    if (password.length < 10 || password.length > 128 || /\s/.test(password)) {
      setNotice("비밀번호는 공백 없이 10~128자로 입력해주세요.");
      return;
    }
    if (password !== confirmation) {
      setNotice("비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    try {
      const result = await confirmPasswordReset(token, password);
      setNotice(result.message);
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
          <TextInput label="새 비밀번호" type="password" autoComplete="new-password" minLength={10} maxLength={128} value={password} disabled={busy} onChange={(event) => { setPassword(event.target.value); setNotice(""); }} />
          <TextInput label="새 비밀번호 확인" type="password" autoComplete="new-password" maxLength={128} value={confirmation} disabled={busy} onChange={(event) => { setConfirmation(event.target.value); setNotice(""); }} />
        </div>
        <div className="auth-submit">
          <Button type="submit" loading={busy}>{busy ? "변경 중…" : "비밀번호 변경"}</Button>
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          {!token && <Link className="reset-retry-link" to="/login">로그인으로 돌아가기</Link>}
        </div>
      </form>
    </AuthLayout>
  );
}

