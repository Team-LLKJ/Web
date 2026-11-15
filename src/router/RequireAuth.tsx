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
  // 로그인 후 원래 보던 페이지로 돌아오게 로그인 화면에 주소를 넘깁니다.
  if (!user)
    return (
      <Navigate
        to={paths.login}
        replace
        state={{ from: `${location.pathname}${location.search}`, notice: "로그인이 필요해요." }}
      />
    );
  if (user.role !== role)
    return <Navigate to={homePathFor(user.role)} replace />;
  return (
    <>
      {children}
      {role === "TEACHER" && <ConsentGate />}
    </>
  );
}
