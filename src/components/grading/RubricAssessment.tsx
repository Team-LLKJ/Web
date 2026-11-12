import { useState } from "react";
import { EmptyState } from "../ui/EmptyState";
import { AutoGrowTextarea } from "./AutoGrowTextarea";
import type { StudentReview } from "../../data/review";
import { Button } from "../ui/Button";
import type { RubricScoreCriterion } from "../../api/types";
import { ReviewSummary } from "./ReviewSummary";
import "./rubric-ai.css";
const levels = ["매우 못함", "못함", "보통", "잘함", "매우 잘함"];

// 참고용 판정 단계 이름(무효 회차는 근거가 원문에 없어 버린 답입니다).
const voteLabel = (value: number | "NA" | "HOLD" | null) =>
  typeof value === "number" ? (levels[value] ?? "-") : value === "NA" ? "해당 없음" : value === "HOLD" ? "보류" : "무효";

/** AI 루브릭 판정 항목의 안내: 해당 없음, 직접 입력 필요(이유별), 보류, AI 추천 근거 */
function ProcessNote({ item }: { item: RubricScoreCriterion }) {
  if (item.status === "NOT_APPLICABLE") {
    return <p className="rubric-ai-note is-empty">AI를 사용하지 않아 해당 없는 항목이에요. 배점은 다른 항목에 나눠졌어요.</p>;
  }
  if (item.needsReview) {
    const votes = (item.votes ?? []).map(voteLabel);
    return (
      <>
        <p className="rubric-ai-note is-empty">
          {item.reviewReason === "INSUFFICIENT_DATA"
            ? "판단할 내용이 적어 직접 입력이 필요해요."
            : "AI 판정이 엇갈려 직접 입력이 필요해요."}
        </p>
        {item.reviewReason !== "INSUFFICIENT_DATA" && votes.length > 0 && (
          <p className="rubric-ai-note">
            참고: Gemini {votes.join(" · ")}
            {item.haikuLevel !== null && item.haikuLevel !== undefined && ` / Haiku ${voteLabel(item.haikuLevel)}`}
          </p>
        )}
      </>
    );
  }
  if (item.status === "HOLD" && !item.teacher) {
    return <p className="rubric-ai-note is-empty">AI가 판단을 보류한 항목이에요. 직접 채점해주세요.</p>;
  }
  if (item.ai && !item.teacher) {
    return (
      <p className="rubric-ai-note">
        <strong>AI 추천 {levels[item.ai.level]}</strong>
        {item.unmetNextLevel ? ` · 위 단계가 아닌 이유: ${item.unmetNextLevel}` : ""}
      </p>
    );
  }
  return null;
}
export function RubricAssessment({
  review,
  onScore,
  onLevel,
  onConfirm,
  onFeedback,
  onAnalysis,
}: {
  review: StudentReview;
  onScore: (id: string, score: number) => void;
  /** 있으면 서버의 기준별 점수(AI 추천 + 교사 점수)로 채점합니다. */
  onLevel?: (criterionId: number, level: number | null) => void;
  onConfirm?: () => Promise<number[]> | void;
  onFeedback?: (criterionId: number, feedback: string) => void;
  onAnalysis: () => void;
}) {
  // 확정을 눌렀을 때 AI도 채점하지 못한 기준만 표시합니다.
  const [missing, setMissing] = useState<number[]>([]);
  // 근거 입력 중인 글(저장 전). 칸에서 벗어날 때 서버에 저장합니다.
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const rubric = review.rubric;
  if (rubric && onLevel) {
    const confirmed = rubric.status === "CONFIRMED";
    const fmt = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
    return (
      <div className="review-cards">
        <section className="review-card summary-card">
          <h3>종합 평가</h3>
          <div className="analysis-overview">
            <ReviewSummary review={review} />
          </div>
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
                const notApplicable = item.status === "NOT_APPLICABLE";
                // AI 루브릭 판정은 교사 수정이 반영된 현재 점수를, 기존 방식은 교사 점수를 보여줍니다.
                const shown = rubric.process ? (item.currentScore ?? null) : (item.teacher?.score ?? null);
                return (
                  <div key={item.criterionId}>
                    {index > 0 && (
                      <div className="asset-divider criterion-divider">
                        <img src="/review-assets/rubric-divider.svg" alt="" />
                      </div>
                    )}
                    <fieldset
                      className={`criterion${!item.teacher && missing.includes(item.criterionId) ? " criterion--missing" : ""}`}
                      disabled={notApplicable}
                    >
                      <legend>
                        {item.name} (
                        {notApplicable ? "해당 없음" : `${shown === null ? "미채점" : fmt(shown)}/${fmt(item.maxScore)}점`})
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
                      {rubric.process ? (
                        <ProcessNote item={item} />
                      ) : (
                        !item.ai && (
                          <p className="rubric-ai-note is-empty">
                            AI가 추천할 근거가 부족해 직접 채점해주세요.
                          </p>
                        )
                      )}
                      {onFeedback &&
                        item.teacher &&
                        (rubric.process || !item.ai || item.teacher.level !== item.ai.level) && (
                        <AutoGrowTextarea
                          className="rubric-reason"
                          maxLength={1000}
                          aria-label={`${item.name} 채점 근거`}
                          placeholder={item.ai ? "AI 추천과 다르게 채점한 근거를 적어주세요" : "이 기준을 채점한 근거를 적어주세요"}
                          value={drafts[item.criterionId] ?? item.teacher.feedback ?? ""}
                          onChange={(event) =>
                            setDrafts((current) => ({ ...current, [item.criterionId]: event.target.value }))
                          }
                          onBlur={() => {
                            const text = drafts[item.criterionId];
                            if (text !== undefined && text !== (item.teacher?.feedback ?? "")) {
                              onFeedback(item.criterionId, text.trim());
                            }
                          }}
                        />
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
            {Boolean(rubric.heldMaxScore) && (
              <small>보류된 항목 {fmt(rubric.heldMaxScore ?? 0)}점은 직접 채점하면 점수에 더해져요.</small>
            )}
            {Boolean(rubric.notApplicableMaxScore) && (
              <small>
                해당 없는 항목 {fmt(rubric.notApplicableMaxScore ?? 0)}점은 다른 항목에 나눠 100점 만점으로 계산했어요.
              </small>
            )}
            {rubric.recommendedMaxScore !== null && rubric.missingAiCriteria.length > 0 && (
              <small>
                AI 추천은 {fmt(rubric.recommendedMaxScore)}점 만점 기준이고, 일부 기준({rubric.missingAiCriteria.join(", ")})은 직접 채점해야 해요.
              </small>
            )}
          </div>
          <div className="rubric-actions">
            {onConfirm && (
              <Button
                size="small"
                onClick={() => void Promise.resolve(onConfirm()).then((ids) => setMissing(ids ?? []))}
                disabled={!rubric.criteria.length}
              >
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
