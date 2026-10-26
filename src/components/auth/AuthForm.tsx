import { useState } from "react";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";
export type AuthCredentials = { username: string; password: string };
type Props = {
  mode: "login" | "signup";
  onSubmit?: (credentials: AuthCredentials) => Promise<void>;
  onResetPassword?: () => void;
};
export function AuthForm({ mode, onSubmit, onResetPassword }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";
  const title = isLogin ? "로그인" : "회원가입";
  async function submit() {
    const next = {
      username: username.trim() ? undefined : "아이디를 입력해주세요.",
      password: password ? undefined : "비밀번호를 입력해주세요.",
    };
    setErrors(next);
    setNotice("");
    if (next.username || next.password) return;
    if (!onSubmit) {
      setNotice(`${title} 서버가 아직 연결되지 않았습니다.`);
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ username: username.trim(), password });
      setPassword("");
    } catch {
      setNotice(`${title}에 실패했습니다. 다시 시도해주세요.`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="auth-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h1>{title}</h1>
      <div className="auth-fields">
        <TextInput
          id={`${mode}-username`}
          label="아이디"
          variant="under-bar"
          placeholder="아이디를 입력해주세요"
          autoComplete="username"
          value={username}
          required
          disabled={busy}
          error={errors.username}
          onChange={(e) => {
            setUsername(e.target.value);
            setErrors((previous) => ({ ...previous, username: undefined }));
            setNotice("");
          }}
        />
        <div className="auth-password-field">
          <TextInput
            id={`${mode}-password`}
            label="비밀번호"
            variant="under-bar"
            type="password"
            placeholder="비밀번호를 입력해주세요"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            required
            disabled={busy}
            error={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((previous) => ({ ...previous, password: undefined }));
              setNotice("");
            }}
          />
          {isLogin && (
            <p className="auth-reset">
              비밀번호를 잊으셨나요?
              <button type="button" onClick={onResetPassword}>
                비밀번호 재설정
              </button>
            </p>
          )}
        </div>
      </div>
      <div className="auth-submit">
        <Button type="submit" disabled={busy}>
          {busy ? "처리 중…" : title}
        </Button>
        {notice && (
          <p className="auth-notice" role="status">
            {notice}
          </p>
        )}
      </div>
    </form>
  );
}
