import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { HeaderUtilities } from "../ui/HeaderDialogs";
export function Header({
  ended,
  onDialog,
  onExtend,
  showActions = true,
}: {
  ended: boolean;
  /** false면 시간 연장·평가 종료 버튼을 숨깁니다(평가를 불러오지 못했을 때). */
  showActions?: boolean;
  onDialog: (message: string) => void;
  onExtend?: () => void;
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
        {showActions && onExtend && !ended && (
          <Button variant="white-primary" onClick={onExtend}>
            시간 연장
          </Button>
        )}
        {showActions && (
          <Button
            variant="white-danger"
            onClick={() => onDialog("평가를 종료하시겠습니까?")}
          >
            {ended ? "평가 종료됨" : "평가 종료하기"}
          </Button>
        )}
      </nav>
    </header>
  );
}
