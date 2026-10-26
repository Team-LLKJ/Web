import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Icon } from "../ui/Icon";
export function Header({
  ended,
  onDialog,
}: {
  ended: boolean;
  onDialog: (message: string) => void;
}) {
  return (
    <header className="header">
      <Link
        to="/views"
        className="lit-logo-link"
        aria-label="LIT 화면 목록으로 이동"
      >
        <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
      </Link>
      <nav aria-label="평가 도구">
        <IconButton
          label="알림"
          onClick={() => onDialog("새로운 알림이 없습니다.")}
        >
          <Icon name="bell" />
        </IconButton>
        <IconButton label="설정" onClick={() => onDialog("평가 설정")}>
          <Icon name="settings" />
        </IconButton>
        <Button
          variant="secondary"
          onClick={() => onDialog("채점 화면에서 나가시겠습니까?")}
        >
          나가기
        </Button>
        <Button
          variant="white-danger"
          onClick={() => onDialog("평가를 종료하시겠습니까?")}
        >
          {ended ? "평가 종료됨" : "평가 종료하기"}
        </Button>
      </nav>
    </header>
  );
}
