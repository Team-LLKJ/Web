import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Toast } from "../components/teacher/Toast";
import { useAuth } from "../auth/useAuth";
import { paths } from "../router/paths";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthForm, type AuthFormPayload } from "../components/auth/AuthForm";

type RouteState = { notice?: string; createEvaluation?: boolean };

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RouteState | null;
  // 회원가입 완료 같은 안내는 화면 위 문구 대신 토스트로 잠깐 보여 줍니다.
  const [notice, setNotice] = useState(state?.notice ?? "");

  async function submit(payload: AuthFormPayload) {
    if ("email" in payload) throw new Error("로그인 정보를 확인해주세요.");
    const user = await login(payload);
    const destination =
      state?.createEvaluation === true && user.role === "TEACHER"
        ? paths.folders
        : paths.home;
    navigate(destination, { replace: true });
  }

  return (
    <>
      <AuthLayout mode="login">
        <AuthForm mode="login" onSubmit={submit} />
      </AuthLayout>
      <Toast message={notice} tone="info" onClose={() => setNotice("")} />
    </>
  );
}
