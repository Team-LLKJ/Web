import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { paths } from "../../router/paths";
import { AuthBrandPanel } from "./AuthBrandPanel";
import "./auth.css";
export function AuthLayout({
  mode,
  children,
}: {
  mode: "login" | "signup";
  children: ReactNode;
}) {
  const isLogin = mode === "login";
  return (
    <main className="auth-scene">
      <div className="auth-stack">
        <div className="auth-card">
          <AuthBrandPanel mode={mode} />
          {children}
        </div>
        <p className="auth-footer">
          {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
          <Link to={isLogin ? paths.signup : paths.login}>
            {isLogin ? "회원가입" : "로그인"}
          </Link>
        </p>
      </div>
    </main>
  );
}
