import { useState, type CSSProperties, type MouseEvent } from "react";

export function ContributionChart({
  value,
  partial,
}: {
  value: number | null;
  /** AI 답변을 활용한 문장의 비율(%). 지정하면 그 뒤 나머지는 복사 붙여넣기(빨강)로 그립니다. */
  partial?: number | null;
}) {
  const percent = value === null ? null : Math.max(0, Math.min(100, value));
  const hasPartial = partial !== null && partial !== undefined;
  const mid =
    percent === null ? 0 : hasPartial ? Math.min(100, percent + Math.max(0, partial)) : 100;
  // 구간 목록: 학생 → AI 활용 → (나머지) 복사 붙여넣기
  const segments =
    percent === null
      ? []
      : [
          { label: "학생이 직접 작성함", from: 0, to: percent },
          { label: "AI의 답변을 사용함", from: percent, to: mid },
          ...(hasPartial ? [{ label: "복사 붙여넣기", from: mid, to: 100 }] : []),
        ];
  const [tip, setTip] = useState<{ x: number; y: number; label: string; share: number } | null>(
    null,
  );
  // 마우스 위치의 각도로 어느 구간인지 찾아 말풍선으로 보여줍니다.
  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const radius = Math.hypot(dx, dy) / (box.width / 2);
    // 도넛의 고리 부분 위에서만 보여줍니다.
    if (radius > 1 || radius < 0.7) return setTip(null);
    const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const at = (angle / 360) * 100;
    const found = segments.find((item) => at >= item.from && at < item.to && item.to > item.from);
    if (!found) return setTip(null);
    setTip({
      x: event.clientX - box.left,
      y: event.clientY - box.top,
      label: found.label,
      share: Math.round((found.to - found.from) * 10) / 10,
    });
  };
  return (
    <div
      className="contribution-chart"
      role="img"
      aria-label={
        percent === null
          ? "답안 기여도 분석 자료 없음"
          : segments.map((item) => `${item.label} ${Math.round(item.to - item.from)}%`).join(", ")
      }
      onMouseMove={onMove}
      onMouseLeave={() => setTip(null)}
    >
      <div
        className={`dynamic-donut ${percent === null ? "is-empty" : ""}`}
        style={
          {
            "--donut-value": `${percent ?? 0}%`,
            "--donut-mid": `${mid}%`,
          } as CSSProperties
        }
      />
      <div className="donut-label">
        <strong>{percent === null ? "—" : `${percent}%`}</strong>
        <span>학생 답변</span>
      </div>
      {tip && (
        <div className="donut-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          <strong>{tip.label}</strong>
          <span>{tip.share}%</span>
        </div>
      )}
    </div>
  );
}
