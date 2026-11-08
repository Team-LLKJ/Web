import type { StudentReview } from "../../data/review";
import type { Message } from "../../data/grading";
import { Modal } from "../ui/Modal";
import { findConversation } from "./conversationMatch";

/** 'AI 추천 매우 못함 (0점) · 이유1 · 이유2' 형태의 문장을 점수 요약과 이유 목록으로 나눕니다. */
function splitReason(text: string) {
  const parts = text.split(" · ").map((part) => part.trim()).filter(Boolean);
  const reasons = parts.slice(1).flatMap((part) => part.split(/,\s+(?=[^,]*\d)/));
  return { summary: parts[0] ?? "", reasons };
}

// 서버가 감점과 가점을 따로 구분해 주지 않아, 문장에 부정적 표현이 있으면 감점으로 분류합니다.
const DEDUCTION = /감점|부족|미작성|미흡|없음|없어|못함|0\s*\/\s*\d|(^|\D)0\s*(개|건|문항)|대리|그대로 복사/;
function classify(reasons: string[]) {
  return {
    deductions: reasons.filter((reason) => DEDUCTION.test(reason)),
    credits: reasons.filter((reason) => !DEDUCTION.test(reason)),
  };
}
// 근거 대화는 종류 정보가 없어, 감점 사유가 하나라도 있으면 감점, 없으면 가점으로 표시합니다.
function evidenceKind(reason: string) {
  const { reasons } = splitReason(`요약 · ${reason}`);
  return classify(reasons).deductions.length > 0 ? "감점" : "가점";
}
// 말풍선 미리보기에서 마크다운 기호를 걷어냅니다.
const plain = (text: string) => text.replace(/```\w*\n?/g, "").replace(/\*\*/g, "");
export function AnalysisModal({
  review,
  messages = [],
  onClose,
  onOpenConversation,
}: {
  review: StudentReview;
  messages?: Message[];
  onClose: () => void;
  onOpenConversation?: (conversationId: number, quote?: string) => void;
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
              <h3 className="analysis-card-head">
                <span>
                  {item.name} ({item.teacher ? fmt(item.teacher.score) : "미채점"}/
                  {fmt(item.maxScore)}점)
                </span>
                {item.ai && (
                  <span className="analysis-ai-pick">
                    AI 추천 {levels[item.ai.level]} ({fmt(item.ai.score)}점)
                  </span>
                )}
              </h3>
              <div className="analysis-body">
                <div>
                  {item.ai ? (
                    (() => {
                      const { reasons } = splitReason(
                        `AI 추천 ${levels[item.ai.level]} (${fmt(item.ai.score)}점) · ${item.ai.reason}`,
                      );
                      const { deductions, credits } = classify(reasons);
                      return (
                        <>
                          {[
                            { kind: "가점", list: credits },
                            { kind: "감점", list: deductions },
                          ]
                            .filter((group) => group.list.length > 0)
                            .map((group) => (
                              <div className="analysis-group" key={group.kind}>
                                <span
                                  className={`analysis-tag ${group.kind === "감점" ? "is-deduction" : "is-credit"}`}
                                >
                                  {group.kind}
                                </span>
                                <p className="analysis-reason-text">{group.list.join(", ")}.</p>
                                {group.kind === evidenceKind(item.ai?.reason ?? "") &&
                                  (item.ai?.evidence ?? []).length > 0 && (
                                    <div className="evidence">
                                      <span className="evidence-caption">
                                        {group.kind === "감점" ? "감점의 원인이 된 대화" : "점수의 근거가 된 대화"}
                                      </span>
                                      {(item.ai?.evidence ?? []).map((entry, index) => {
                                        const id = entry.conversationId;
                                        if (id === undefined) return null;
                                        const chat = findConversation(messages, id);
                                        return (
                                          <button
                                            type="button"
                                            className="evidence-row"
                                            key={index}
                                            onClick={() => onOpenConversation?.(id, entry.quote)}
                                            title="채팅에서 보기"
                                          >
                                            <span className="evidence-id">#{id}</span>
                                            <span className="evidence-text">
                                              {chat?.prompt ? plain(chat.prompt.content) : "AI 대화"}
                                            </span>
                                            <span className="evidence-go" aria-hidden="true">›</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                              </div>
                            ))}
                        </>
                      );
                    })()
                  ) : (
                    <p>AI가 추천할 근거가 부족해 직접 채점이 필요한 기준입니다.</p>
                  )}
                  {item.teacher?.feedback && <p>교사 의견: {item.teacher.feedback}</p>}
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
