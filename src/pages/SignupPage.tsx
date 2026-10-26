import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthForm } from "../components/auth/AuthForm";
export function SignupPage() {
  return (
    <AuthLayout mode="signup">
      <AuthForm mode="signup" />
    </AuthLayout>
  );
}
