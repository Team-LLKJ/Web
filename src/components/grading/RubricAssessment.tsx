import { EmptyState } from "../ui/EmptyState";
import type { StudentReview } from "../../data/review";
import { Button } from "../ui/Button";
import "./rubric-ai.css";
const levels = ["매우 못함", "못함", "보통", "잘함", "매우 잘함"];
export function RubricAssessment({
  review,
  onScore,
  onLevel,
  onConfirm,
  onAnalysis,
}: {
  review: StudentReview;
  onScore: (id: string, score: number) => void;
  /** 있으면 서버의 기준별 점수(AI 추천 + 교사 점수)로 채점합니다. */
  onLevel?: (criterionId: number, level: number | null) => void;
  onConfirm?: () => void;
  onAnalysis: () => void;
}) {
  const rubric = review.rubric;
  if (rubric && onLevel) {
    const confirmed = rubric.status === "CONFIRMED";
    const fmt = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
    return (
      <div className="review-cards">
        <section className="review-card summary-card">
          <h3>종합 평가</h3>
          <p>{review.summary}</p>
        </section>
        <section className="review-card rubric-card">
          <div className="criteria-list">
            <div className="rubric-head">
              <h3>평가 기준별 루브릭</h3>
              <span className={`rubric-status${confirmed ? " is-confirmed" : ""}`}>
                {confirmed ? "채점 확정됨" : "채점 중"}
              </span>
            </div>
            {rubric.criteria.length ? (
              rubric.criteria.map((item, index) => {
                const selected = item.teacher?.level ?? null;
                const aiLevel = item.ai?.level ?? null;
                return (
                  <div key={item.criterionId}>
                    {index > 0 && (
                      <div className="asset-divider criterion-divider">
                        <img src="/review-assets/rubric-divider.svg" alt="" />
                      </div>
                    )}
                    <fieldset className="criterion">
                      <legend>
                        {item.name} (
                        {item.teacher ? fmt(item.teacher.score) : "미채점"}/{fmt(item.maxScore)}점)
                      </legend>
                      <div className="rating-options">
                        {levels.map((label, i) => (
                          <button
                            type="button"
                            key={label}
                            aria-pressed={selected === i}
                            className={`${selected === i ? "selected" : ""}${aiLevel === i ? " ai-recommended" : ""}`}
                            title={aiLevel === i ? "AI 추천" : undefined}
                            onClick={() => onLevel(item.criterionId, selected === i ? null : i)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {item.ai ? (
                        <p className="rubric-ai-note">
                          <strong>AI 추천 {levels[item.ai.level]}</strong> · {item.ai.reason}
                        </p>
                      ) : (
                        <p className="rubric-ai-note is-empty">
                          AI가 추천할 근거가 부족해 직접 채점해주세요.
                        </p>
                      )}
                    </fieldset>
                  </div>
                );
              })
            ) : (
              <EmptyState size="inline" icon="doc" title="등록된 루브릭이 없어요" />
            )}
          </div>
          <div className="rubric-total">
            <span>
              {confirmed ? "확정 점수" : "현재 점수"}{" "}
              <strong>
                {confirmed && rubric.confirmedTotal !== null
                  ? fmt(rubric.confirmedTotal)
                  : rubric.totalCurrent !== null
                    ? fmt(rubric.totalCurrent)
                    : "-"}
              </strong>
            </span>
            {rubric.recommendedMaxScore !== null && rubric.missingAiCriteria.length > 0 && (
              <small>
                AI 추천은 {fmt(rubric.recommendedMaxScore)}점 만점 기준이고, 일부 기준({rubric.missingAiCriteria.join(", ")})은 직접 채점해야 해요.
              </small>
            )}
          </div>
          <div className="rubric-actions">
            {onConfirm && (
              <Button size="small" onClick={onConfirm} disabled={!rubric.criteria.length}>
                {confirmed ? "수정 후 다시 확정" : "채점 확정"}
              </Button>
            )}
            <Button
              size="small"
              variant="secondary"
              onClick={onAnalysis}
              disabled={!review.criteria.length}
            >
              평가 근거 및 상세 분석 보기
            </Button>
          </div>
        </section>
      </div>
    );
  }
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
