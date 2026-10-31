import type { ReactNode } from "react";
import { useScrolled } from "../../hooks/useScrolled";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { HeaderUtilities } from "../ui/HeaderDialogs";

type Props = {
  /** Shows a "나가기" button when provided. */
  onLeave?: () => void;
  /** Page-specific primary actions, rendered last (rightmost). */
  children?: ReactNode;
  className?: string;
};

/** Shared header for every teacher screen: logo, alerts, settings, leave, primary action. */
export function TeacherHeader({ onLeave, children, className = "" }: Props) {
  const scrolled = useScrolled();

  return (
    <>
      <header
        className={`header teacher-header${scrolled ? " is-scrolled" : ""} ${className}`}
      >
        <Link
          to="/teacher/evaluations"
          className="lit-logo-link"
          aria-label="내 수행평가로 이동"
        >
          <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
        </Link>
        <nav aria-label="선생님 도구">
          <HeaderUtilities />
          {onLeave && (
            <Button variant="secondary" onClick={onLeave}>
              나가기
            </Button>
          )}
          {children}
        </nav>
      </header>
    </>
  );
}
