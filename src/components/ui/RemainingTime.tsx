import { formatRemaining, useRemainingMs, type EndInfo } from "../../lib/remainingTime";
import "./remaining-time.css";

/** 남은 풀이 시간을 보여 주는 알약. 종료 시각을 모르면 아무것도 그리지 않습니다. */
export function RemainingTime({ info }: { info: EndInfo | null }) {
  const remaining = useRemainingMs(info);
  if (remaining === null) return null;
  return (
    <span
      className="remaining-time"
      data-low={remaining <= 5 * 60_000 || undefined}
      role="timer"
      aria-label={`남은 시간 ${formatRemaining(remaining)}`}
    >
      <span className="remaining-time-label">남은 시간</span>
      <strong>{formatRemaining(remaining)}</strong>
    </span>
  );
}
