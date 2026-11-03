import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import type { UserRole } from "../api/types";
import { ConsentGate } from "../components/auth/ConsentGate";
import { homePathFor } from "./paths";

export function RequireAuth({ children, role }: { children: ReactNode; role: UserRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  // 로그인이 풀렸거나 로그인하지 않았으면 로그인 화면이 아니라 서비스 소개 화면(처음 화면)으로 보냅니다.

  if (loading) return null;
  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  if (user.role !== role) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }
  return (
    <>
      {children}
      {role === "TEACHER" && <ConsentGate />}
    </>
  );
}

