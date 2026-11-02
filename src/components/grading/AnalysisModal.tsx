import type { StudentReview } from "../../data/review";
import { Modal } from "../ui/Modal";
export function AnalysisModal({
  review,
  onClose,
}: {
  review: StudentReview;
  onClose: () => void;
}) {
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
