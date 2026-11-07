import type { CSSProperties } from "react";

export function ContributionChart({ value }: { value: number | null }) {
  const percent = value === null ? null : Math.max(0, Math.min(100, value));
  return (
    <div
      className="contribution-chart"
      role="img"
      aria-label={
        percent === null
          ? "답안 기여도 분석 자료 없음"
          : `학생 답변 ${percent}%`
      }
    >
      <div
        className={`dynamic-donut ${percent === null ? "is-empty" : ""}`}
        style={{ "--donut-value": `${percent ?? 0}%` } as CSSProperties}
      />
      <div className="donut-label">
        <strong>{percent === null ? "—" : `${percent}%`}</strong>
        <span>학생 답변</span>
      </div>
    </div>
  );
}
