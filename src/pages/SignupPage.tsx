import { useNavigate } from "react-router-dom";
import type { TeacherSignup } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthForm, type AuthFormPayload } from "../components/auth/AuthForm";

export function SignupPage() {
  const { signupTeacher } = useAuth();
  const navigate = useNavigate();

  async function submit(payload: AuthFormPayload) {
    if ("emailVerificationToken" in payload) await signupTeacher(payload as TeacherSignup);
    else throw new Error("회원가입 정보를 확인해주세요.");
    navigate("/login", { replace: true, state: { notice: "회원가입이 완료되었습니다. 로그인해주세요." } });
  }

  return (
    <AuthLayout mode="signup">
      <AuthForm mode="signup" onSubmit={submit} />
    </AuthLayout>
  );
}
