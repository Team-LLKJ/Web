import type { StudentReview } from "../../data/review";
import { Modal } from "../ui/Modal";
export function AnalysisModal({
  review,
  onClose,
  onOpenConversation,
}: {
  review: StudentReview;
  onClose: () => void;
  onOpenConversation?: (conversationId: number) => void;
}) {
  const rubric = review.rubric;
  const levels = ["매우 못함", "못함", "보통", "잘함", "매우 잘함"];
  const fmt = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
  // 서버의 기준별 점수가 있으면 루브릭 탭과 같은 기준·점수로 보여줍니다.
  if (rubric) {
    return (
      <Modal
        title="평가 근거 및 상세 분석 보기"
        onClose={onClose}
        className="analysis-modal"
      >
        <div className="analysis-cards">
          {rubric.criteria.map((item) => (
            <section className="analysis-card" key={item.criterionId}>
              <h3>
                {item.name} ({item.teacher ? fmt(item.teacher.score) : "미채점"}/
                {fmt(item.maxScore)}점)
              </h3>
              <div className="analysis-body">
                <div>
                  <h4>평가 이유</h4>
                  <p>
                    {item.ai
                      ? `AI 추천 ${levels[item.ai.level]} (${fmt(item.ai.score)}점) · ${item.ai.reason}`
                      : "AI가 추천할 근거가 부족해 직접 채점이 필요한 기준입니다."}
                  </p>
                  {item.teacher?.feedback && <p>교사 의견: {item.teacher.feedback}</p>}
                </div>
                <div className="asset-divider">
                  <img src="/review-assets/analysis-divider.svg" alt="" />
                </div>
                <div className="evidence">
                  <h4>평가 근거</h4>
                  {item.ai?.evidence.length ? (
                    item.ai.evidence.map((entry, index) => (
                      <p key={index}>
                        {entry.conversationId !== undefined ? (
                          <button
                            type="button"
                            className="evidence-link"
                            onClick={() => onOpenConversation?.(entry.conversationId as number)}
                          >
                            AI 대화 #{entry.conversationId}
                          </button>
                        ) : (
                          "관련 기록"
                        )}
                      </p>
                    ))
                  ) : (
                    <p>등록된 평가 근거가 없습니다.</p>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      </Modal>
    );
  }
  const items = review.analysis.length ? review.analysis : review.criteria;
  return (
    <Modal
      title="평가 근거 및 상세 분석 보기"
      onClose={onClose}
      className="analysis-modal"
    >
      <div className="analysis-cards">
        {items.map((item) => {
          const score =
            review.criteria.find((criterion) => criterion.id === item.id)
              ?.score ?? item.score;
          return (
            <section className="analysis-card" key={item.id}>
              <h3>
                {item.criterion} ({score === null ? "미채점" : score}/
                {item.maxScore}점)
              </h3>
              <div className="analysis-body">
                <div>
                  <h4>평가 이유</h4>
                  <p>{item.feedback}</p>
                </div>
                <div className="asset-divider">
                  <img src="/review-assets/analysis-divider.svg" alt="" />
                </div>
                <div className="evidence">
                  <h4>평가 근거</h4>
                  {item.evidence.length ? (
                    item.evidence.map((quote, index) => (
                      <p key={index}>{quote}</p>
                    ))
                  ) : (
                    <p>등록된 평가 근거가 없습니다.</p>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
