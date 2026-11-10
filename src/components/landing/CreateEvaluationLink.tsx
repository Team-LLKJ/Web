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
  if (loading || user?.role === "STUDENT") return null;

  return (
    <Link
      className={className}
      to={user ? paths.folders : paths.login}
      state={user ? undefined : { createEvaluation: true }}
    >
      {children}
    </Link>
  );
}
