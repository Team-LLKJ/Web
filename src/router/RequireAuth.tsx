import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import type { UserRole } from "../api/types";
import { PageLoading } from "../components/ui/PageLoading";
import { getLoadingLayout } from "../components/ui/loadingLayout";
import { ConsentGate } from "../components/auth/ConsentGate";
import { homePathFor, paths } from "./paths";

export function RequireAuth({
  children,
  role,
}: {
  children: ReactNode;
  role: UserRole;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return <PageLoading layout={getLoadingLayout(location.pathname)} />;
  // 로그인하지 않았으면 로그아웃됐을 때와 같이 처음 화면으로 보냅니다.
  if (!user) return <Navigate to={paths.home} replace />;
  if (user.role !== role)
    return <Navigate to={homePathFor(user.role)} replace />;
  return (
    <>
      {children}
      {role === "TEACHER" && <ConsentGate />}
    </>
  );
}
