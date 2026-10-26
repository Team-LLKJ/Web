import type { StudentReview } from "../../data/review";
import { ContributionChart } from "./ContributionChart";
export function ActivityAnalysis({ review }: { review: StudentReview }) {
  return (
    <div className="review-cards">
      <section className="review-card contribution-card">
        <ContributionChart value={review.studentContribution} />
        <div className="contribution-legend">
          <h3>답안 기여도 분석</h3>
          <p>
            <i />
            학생이 직접 작성함
          </p>
          <p>
            <i className="ai-dot" />
            AI의 답변을 사용함
          </p>
        </div>
      </section>
      <section className="review-card usage-card">
        <h3>AI사용 방법 분석</h3>
        <div className="usage-rows">
          {review.usage.length ? (
            review.usage.map((metric) => (
              <div className="usage-row" key={metric.label}>
                <span>{metric.label}</span>
                <div
                  className="usage-track"
                  role="meter"
                  aria-label={metric.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={metric.percent}
                >
                  <div
                    style={{
                      width: `${metric.percent}%`,
                      background: metric.color,
                    }}
                  />
                </div>
                <span className="usage-level">{metric.level}</span>
              </div>
            ))
          ) : (
            <p className="empty">분석 자료가 없습니다.</p>
          )}
        </div>
      </section>
      <section className="review-card warnings-card">
        <h3>경고</h3>
        <div className="warning-list">
          {review.warnings.length ? (
            review.warnings.map((warning, index) => (
              <div key={warning.id}>
                {index > 0 && (
                  <div className="asset-divider">
                    <img src="/review-assets/warning-divider.svg" alt="" />
                  </div>
                )}
                <div className="warning-row">
                  <span className="warning-description">
                    <span className="warning-icon">
                      <img
                        src={
                          warning.type === "command"
                            ? "/review-assets/warning-command.svg"
                            : "/review-assets/warning.svg"
                        }
                        alt=""
                        width="20"
                        height="20"
                      />
                    </span>
                    {warning.label}
                  </span>
                  <time>{warning.time}</time>
                </div>
              </div>
            ))
          ) : (
            <p className="empty">경고 기록이 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
}
