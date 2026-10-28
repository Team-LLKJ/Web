import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import type { UserRole } from "../api/types";

export function RequireAuth({ children, role }: { children: ReactNode; role: UserRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <main className="route-loading" role="status">계정 정보를 확인하고 있습니다…</main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== role) {
    return <Navigate to={user.role === "TEACHER" ? "/teacher/evaluations" : "/student/join"} replace />;
  }
  return children;
}

