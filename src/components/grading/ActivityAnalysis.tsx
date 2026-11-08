import { EmptyState } from "../ui/EmptyState";
import type { StudentReview } from "../../data/review";
import { ContributionChart } from "./ContributionChart";
import "./grading-extras.css";
/** 이보다 짧은 답안은 유사도 분석이 의미가 없어 분석하지 않습니다. */
const MIN_ANSWER_CHARS = 100;
export function ActivityAnalysis({
  review,
  warningsOnly = false,
  answerChars,
  authorMark = null,
  onAuthorMark,
}: {
  review: StudentReview;
  /** 답안에 줄을 쳐 보여주는 중인 종류 */
  authorMark?: "student" | "ai" | "paste" | null;
  onAuthorMark?: (kind: "student" | "ai" | "paste" | null) => void;
  /** 평가 중에는 경고 기록만 보여주고 기여도·AI 사용 분석은 숨깁니다. */
  warningsOnly?: boolean;
  /** 학생이 쓴 답안의 전체 글자 수. 없거나 너무 적으면 기여도 분석을 하지 않습니다. */
  answerChars?: number;
}) {
  // 답안이 없거나 분석하기엔 글이 너무 적을 때 보여줄 안내
  const notice =
    answerChars === undefined
      ? null
      : answerChars === 0
        ? { title: "분석할 수 없습니다", description: "제출한 답안이 없어요." }
        : answerChars < MIN_ANSWER_CHARS || review.studentContribution === null
          ? {
              title: "분석하기 어렵습니다",
              description: "답안이 너무 짧아 신뢰할 수 있는 분석을 할 수 없어요.",
            }
          : null;
  // 구간별 비율(%): 학생 / AI 활용 / 복사 붙여넣기(나머지)
  const student = review.studentContribution;
  const partial = review.analysisDetail?.contribution?.aiReferenced;
  const shares =
    student === null
      ? null
      : {
          student: Math.round(student),
          ai: Math.round(partial ?? 100 - student),
          paste: partial === undefined ? null : Math.max(0, 100 - Math.round(student) - Math.round(partial)),
        };
  return (
    <div className="review-cards">
      {!warningsOnly && notice && (
        <section className="review-card contribution-card contribution-card--empty">
          <h3>답안 기여도 분석</h3>
          <EmptyState size="inline" icon="doc" title={notice.title} description={notice.description} />
        </section>
      )}
      {!warningsOnly && !notice && (
      <section className="review-card contribution-card contribution-card--titled">
        <h3 className="contribution-title">답안 기여도 분석</h3>
        <div className="contribution-body">
        <ContributionChart
          value={review.studentContribution}
          partial={review.analysisDetail?.contribution?.aiReferenced}
        />
        <div className="contribution-legend">
          <button
            type="button"
            className={`legend-toggle${authorMark === "student" ? " is-on" : ""}`}
            aria-pressed={authorMark === "student"}
            title="답안에서 학생이 직접 쓴 부분 보기"
            onClick={() => onAuthorMark?.(authorMark === "student" ? null : "student")}
          >
            <i />
            <span className="legend-name">학생이 직접 작성함</span>
            {shares && <span className="legend-share">{shares.student}%</span>}
          </button>
          <button
            type="button"
            className={`legend-toggle${authorMark === "ai" ? " is-on" : ""}`}
            aria-pressed={authorMark === "ai"}
            title="답안에서 AI 답변과 비슷한 부분 보기"
            onClick={() => onAuthorMark?.(authorMark === "ai" ? null : "ai")}
          >
            <i className="ai-dot" />
            <span className="legend-name">AI의 답변을 사용함</span>
            {shares && <span className="legend-share">{shares.ai}%</span>}
          </button>
          <button
            type="button"
            className={`legend-toggle${authorMark === "paste" ? " is-on" : ""}`}
            aria-pressed={authorMark === "paste"}
            title="AI 답변을 거의 그대로 옮긴 것으로 보이는 부분 보기 (추정)"
            onClick={() => onAuthorMark?.(authorMark === "paste" ? null : "paste")}
          >
            <i className="paste-dot" />
            <span className="legend-name">복사 붙여넣기</span>
            {shares && shares.paste !== null && <span className="legend-share">{shares.paste}%</span>}
          </button>
        </div>
        </div>
      </section>
      )}
      {!warningsOnly && (
      <section className="review-card usage-card">
        <h3>AI사용 방법 분석</h3>
        <div className="usage-rows">
          {review.usage.length ? (
            review.usage.map((metric) => (
              <div className="usage-row" key={metric.label}>
                <span className="usage-label">{metric.label}</span>
                <div
                  className="usage-track"
                  title={`${metric.percent}%`}
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
                <span className="usage-level" data-level={metric.level}>
                  {metric.percent}% · {metric.level}
                </span>
              </div>
            ))
          ) : (
            <EmptyState size="inline" icon="doc" title="분석 자료가 없어요" />
          )}
        </div>
      </section>
      )}
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
            <EmptyState size="inline" icon="doc" title="경고 기록이 없어요" />
          )}
        </div>
      </section>
    </div>
  );
}
