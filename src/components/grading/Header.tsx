import { Link } from "react-router-dom";
import { HeaderUtilities } from "../ui/HeaderDialogs";
export function Header({
  ended,
  exitPath,
}: {
  ended: boolean;
  /** 나가기: 이 반이 속한 수행평가 화면 */
  exitPath: string;
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
              to={exitPath}
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
