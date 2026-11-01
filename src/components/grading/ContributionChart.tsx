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
      {percent === 100 ? (
        <div className="donut-assets" aria-hidden="true">
          <img src="/review-assets/donut-track.svg" alt="" />
          <img src="/review-assets/donut-value.svg" alt="" />
        </div>
      ) : (
        <div
          className="dynamic-donut"
          style={{
            background:
              percent === null
                ? "#f4f4f4"
                : `conic-gradient(#007bff ${percent}%, #52A6FF 0)`,
          }}
        />
      )}
      <div className="donut-label">
        <strong>{percent === null ? "—" : `${percent}%`}</strong>
        <span>학생 답변</span>
      </div>
    </div>
  );
}
