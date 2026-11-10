import { Link } from "react-router-dom";
import { HeaderUtilities } from "../ui/HeaderDialogs";
export function Header({
  ended,
  previousPath,
}: {
  ended: boolean;
  previousPath: string;
}) {
  return (
    <header className="header">
      <Link to="/" className="lit-logo-link" aria-label="처음 화면으로 이동">
        <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
      </Link>
      <nav aria-label="평가 도구">
        <HeaderUtilities />
        {ended && (
          <>
            <Link
              to={previousPath}
              className="button button--secondary neutral button--small grading-end-nav"
            >
              이전
            </Link>
            <Link
              to="/teacher/evaluations"
              className="button button--secondary neutral button--small grading-end-nav"
            >
              나가기
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
