import { Link } from "react-router-dom";
import { useScrolled } from "../../hooks/useScrolled";
import { Button } from "../ui/Button";
import { HeaderUtilities } from "../ui/HeaderDialogs";
export function StudentHeader({
  submitted,
  disabledSubmit = false,
  onLeave,
  onSubmit,
  onPolicy,
}: {
  submitted: boolean;
  disabledSubmit?: boolean;
  onLeave: () => void;
  onSubmit: () => void;
  onPolicy: () => void;
}) {
  const scrolled = useScrolled();
  return (
    <header className={`header student-header${scrolled ? " is-scrolled" : ""}`}>
      <Link
        to="/views"
        className="lit-logo-link"
        aria-label="LIT 화면 목록으로 이동"
      >
        <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
      </Link>
      <nav aria-label="학생 평가 도구">
        <HeaderUtilities onSettings={onPolicy} />
        <Button variant="secondary" onClick={onLeave}>
          나가기
        </Button>
        <Button onClick={onSubmit} disabled={submitted || disabledSubmit}>
          {submitted ? "제출 완료" : "제출하기"}
        </Button>
      </nav>
    </header>
  );
}
