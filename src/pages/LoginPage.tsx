import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthForm, type AuthFormPayload } from "../components/auth/AuthForm";

type RouteState = { from?: { pathname?: string }; notice?: string };

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RouteState | null;

  async function submit(payload: AuthFormPayload) {
    if ("email" in payload) throw new Error("로그인 정보를 확인해주세요.");
    await login(payload);
    const requestedPath = state?.from?.pathname;
    const destination = requestedPath?.startsWith("/teacher/")
      ? requestedPath
      : "/teacher/evaluations";
    navigate(destination, { replace: true });
  }

  return (
    <>
      <AuthLayout mode="login">
        {state?.notice && <p className="auth-page-notice" role="status">{state.notice}</p>}
        <AuthForm mode="login" onSubmit={submit} />
      </AuthLayout>
    </>
  );
}
