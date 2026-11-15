import { useScrolled } from "../../hooks/useScrolled";
import { Button } from "../ui/Button";
import { HeaderUtilities } from "../ui/HeaderDialogs";
import { RemainingTime } from "../ui/RemainingTime";
import type { EndInfo } from "../../lib/remainingTime";
export function StudentHeader({
  submitted,
  disabledSubmit = false,
  onSubmit,
  onPolicy,
  endInfo = null,
}: {
  submitted: boolean;
  disabledSubmit?: boolean;
  /** 예전 나가기 버튼용. 제출하면 자동으로 나가므로 지금은 쓰지 않습니다. */
  onLeave?: () => void;
  onSubmit: () => void;
  onPolicy: () => void;
  /** 풀이 종료 시각. 있으면 남은 시간을 보여 줍니다. */
  endInfo?: EndInfo | null;
}) {
  const scrolled = useScrolled();
  return (
    <header className={`header student-header${scrolled ? " is-scrolled" : ""}`}>
      {/* 풀이 중에는 로고를 눌러 평가를 벗어나지 않게 링크를 두지 않습니다. */}
      <span className="lit-logo-link">
        <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
      </span>
      <nav aria-label="학생 평가 도구">
        {!submitted && <RemainingTime info={endInfo} />}
        {/* 같은 기기에 선생님이 로그인해 있어도 학생에게 선생님 알림이 보이지 않게 합니다. */}
        <HeaderUtilities onSettings={onPolicy} notifications={false} />
        <Button onClick={onSubmit} disabled={submitted || disabledSubmit}>
          {submitted ? "제출 완료" : "제출하기"}
        </Button>
      </nav>
    </header>
  );
}
