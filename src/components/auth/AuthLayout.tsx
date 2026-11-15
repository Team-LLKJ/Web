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
        <Link to="/" className="auth-mobile-logo" aria-label="LIT 처음 화면으로 이동">
          <img src="/lit-logo.png" width="80" height="40" alt="LIT" />
        </Link>
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
