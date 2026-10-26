import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Icon } from "../ui/Icon";
export function StudentHeader({
  submitted,
  onLeave,
  onSubmit,
  onNotice,
}: {
  submitted: boolean;
  onLeave: () => void;
  onSubmit: () => void;
  onNotice: (title: string) => void;
}) {
  return (
    <header className="header student-header">
      <Link
        to="/views"
        className="lit-logo-link"
        aria-label="LIT 화면 목록으로 이동"
      >
        <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
      </Link>
      <nav aria-label="학생 평가 도구">
        <IconButton
          label="알림"
          onClick={() => onNotice("새로운 알림이 없습니다.")}
        >
          <Icon name="bell" />
        </IconButton>
        <IconButton label="설정" onClick={() => onNotice("평가 설정")}>
          <Icon name="settings" />
        </IconButton>
        <Button variant="secondary" onClick={onLeave}>
          나가기
        </Button>
        <Button onClick={onSubmit} disabled={submitted}>
          {submitted ? "제출 완료" : "제출하기"}
        </Button>
      </nav>
    </header>
  );
}
