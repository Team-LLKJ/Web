import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { paths } from "../../router/paths";

export function CreateEvaluationLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { user, loading } = useAuth();
  // 로그인 확인 중에도 버튼은 바로 보여 줍니다(늦게 나타나 화면이 밀리는 것을 막기 위해).
  // 학생 계정으로 확인되면 그때 감춥니다.
  if (user?.role === "STUDENT") return null;

  return (
    <Link
      className={className}
      to={user ? paths.folders : paths.login}
      state={user ? undefined : { createEvaluation: true }}
      aria-busy={loading || undefined}
      onClick={(event) => {
        // 로그인 확인이 끝나기 전에는 이동하지 않습니다(교사는 폴더로, 비로그인은 로그인으로 가야 하므로).
        if (loading) event.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}
