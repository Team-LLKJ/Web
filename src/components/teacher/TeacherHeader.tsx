import type { ReactNode } from "react";
import { useScrolled } from "../../hooks/useScrolled";
import { Link } from "react-router-dom";
import { HeaderUtilities } from "../ui/HeaderDialogs";

type Props = {
  /** Page-specific primary actions, rendered last (rightmost). */
  children?: ReactNode;
  className?: string;
};

/** Shared header for every teacher screen: logo, alerts, settings, leave, primary action. */
export function TeacherHeader({ children, className = "" }: Props) {
  const scrolled = useScrolled();

  return (
    <>
      <header
        className={`header teacher-header${scrolled ? " is-scrolled" : ""} ${className}`}
      >
        <Link
          to="/"
          className="lit-logo-link"
          aria-label="처음 화면으로 이동"
        >
          <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
        </Link>
        <nav aria-label="선생님 도구">
          <HeaderUtilities />
          {children}
        </nav>
      </header>
    </>
  );
}
