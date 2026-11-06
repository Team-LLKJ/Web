import { EmptyState } from "../ui/EmptyState";
import type { StudentReview } from "../../data/review";
import { Button } from "../ui/Button";
const levels = ["매우 못함", "못함", "보통", "잘함", "매우 잘함"];
export function RubricAssessment({
  review,
  onScore,
  onAnalysis,
}: {
  review: StudentReview;
  onScore: (id: string, score: number) => void;
  onAnalysis: () => void;
}) {
  return (
    <div className="review-cards">
      <section className="review-card summary-card">
        <h3>종합 평가</h3>
        <p>{review.summary}</p>
      </section>
      <section className="review-card rubric-card">
        <div className="criteria-list">
          <h3>평가 기준별 루브릭</h3>
          {review.criteria.length ? (
            review.criteria.map((item, index) => (
              <div key={item.id}>
                {index > 0 && (
                  <div className="asset-divider criterion-divider">
                    <img src="/review-assets/rubric-divider.svg" alt="" />
                  </div>
                )}
                <fieldset className="criterion">
                  <legend>
                    {item.criterion} (
                    {item.score === null ? "미채점" : item.score}/
                    {item.maxScore}점)
                  </legend>
                  <div className="rating-options">
                    {levels.map((label, i) => {
                      const score = Math.round(((i + 1) * item.maxScore) / 5);
                      return (
                        <button
                          type="button"
                          key={label}
                          aria-pressed={item.score === score}
                          className={item.score === score ? "selected" : ""}
                          onClick={() => onScore(item.id, score)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            ))
          ) : (
            <EmptyState size="inline" icon="doc" title="등록된 루브릭이 없어요" />
          )}
        </div>
        <Button
          size="small"
          onClick={onAnalysis}
          disabled={!review.criteria.length}
        >
          평가 근거 및 상세 분석 보기
        </Button>
      </section>
    </div>
  );
}
