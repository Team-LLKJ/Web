import { Link } from "react-router-dom";
import { HeaderUtilities } from "../ui/HeaderDialogs";
export function Header({
  ended,
}: {
  ended: boolean;
}) {
  return (
    <header className="header">
      <Link
        to="/teacher/evaluations"
        className="lit-logo-link"
        aria-label="내 수행평가로 이동"
      >
        <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
      </Link>
      <nav aria-label="평가 도구">
        <HeaderUtilities />
        {ended && (
          <Link
            to="/teacher/evaluations"
            className="button button--secondary neutral button--medium"
          >
            나가기
          </Link>
        )}
      </nav>
    </header>
  );
}
