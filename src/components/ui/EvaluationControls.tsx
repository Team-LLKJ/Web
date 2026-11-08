import { Button } from "./Button";
import { RemainingTime } from "./RemainingTime";
import type { EndInfo } from "../../lib/remainingTime";
import "./evaluation-controls.css";

/** 평가 진행 중에만 쓰는 조작 상자: 남은 시간, 시간 연장, 평가 종료. 헤더와 따로 둡니다. */
export function EvaluationControls({
  endInfo,
  onExtend,
  onEnd,
  className = "",
}: {
  endInfo: EndInfo | null;
  onExtend: () => void;
  onEnd: () => void;
  className?: string;
}) {
  return (
    <section className={`evaluation-controls ${className}`} aria-label="평가 진행">
      <RemainingTime info={endInfo} />
      <div className="evaluation-controls-actions">
        <Button variant="white-primary" onClick={onExtend}>
          시간 연장
        </Button>
        <Button variant="white-danger" onClick={onEnd}>
          평가 종료하기
        </Button>
      </div>
    </section>
  );
}
