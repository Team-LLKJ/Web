import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { homePathFor } from "../router/paths";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthForm, type AuthFormPayload } from "../components/auth/AuthForm";

type RouteState = { notice?: string };

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RouteState | null;

  async function submit(payload: AuthFormPayload) {
    if ("email" in payload) throw new Error("로그인 정보를 확인해주세요.");
    const current = await login(payload);
    navigate(homePathFor(current.role), { replace: true });
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
