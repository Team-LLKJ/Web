import type { StudentReview } from "../../data/review";
import type { Message } from "../../data/grading";
import { Modal } from "../ui/Modal";
import { findConversation } from "./conversationMatch";
import { criterionKey, questionEffects } from "./questionEffects";
import { estimateAiSentences } from "./authorshipMark";

/** 'AI 추천 매우 못함 (0점) · 이유1 · 이유2' 형태의 문장을 점수 요약과 이유 목록으로 나눕니다. */
function splitReason(text: string) {
  const parts = text.split(" · ").map((part) => part.trim()).filter(Boolean);
  const reasons = parts.slice(1).flatMap((part) => part.split(/,\s+(?=[^,]*\d)/));
  return { summary: parts[0] ?? "", reasons };
}

// 서버가 감점과 가점을 따로 구분해 주지 않아, 문장에 부정적 표현이 있으면 감점으로 분류합니다.
const DEDUCTION = /감점|부족|미작성|미흡|없음|없어|못함|0\s*\/\s*\d|(^|\D)0\s*(개|건|문항)|대리|그대로 복사/;
// '필수 기록 3개 중 1개 (사용 AI 도구 X, 질문 기록 O, 답안 활용 부분 X)'처럼 O/X로 적힌 항목을
// '사용한 AI 도구를 적지 않았어요'(감점) 같은 문장으로 하나씩 풀어 씁니다.
const CHECK_TEXT: Record<string, [string, string]> = {
  "사용 AI 도구": ["사용한 AI 도구를 밝혔어요", "사용한 AI 도구를 적지 않았어요"],
  "질문 기록": ["AI에게 한 질문 기록이 남아 있어요", "AI에게 한 질문 기록이 없어요"],
  "답안 활용 부분": ["답안에서 AI를 활용한 부분을 밝혔어요", "답안에서 AI를 활용한 부분을 적지 않았어요"],
  "활용 이유": ["AI를 활용한 이유를 밝혔어요", "AI를 활용한 이유를 적지 않았어요"],
};
function expandChecks(reasons: string[]) {
  return reasons.flatMap((reason) => {
    const inner = reason.match(/\(([^()]*\s[OX](?:,\s*[^()]*\s[OX])*)\)/);
    if (!inner) return [{ text: reason, kind: null as "가점" | "감점" | null }];
    return inner[1].split(/,\s*/).map((part) => {
      const ok = part.trim().endsWith("O");
      const label = part.trim().replace(/\s[OX]$/, "");
      const pair = CHECK_TEXT[label];
      return {
        text: pair ? pair[ok ? 0 : 1] : `${label} ${ok ? "있음" : "없음"}`,
        kind: (ok ? "가점" : "감점") as "가점" | "감점",
      };
    });
  });
}
function classify(input: string[]) {
  const reasons = expandChecks(input);
  const isDeduction = (r: { text: string; kind: "가점" | "감점" | null }) =>
    r.kind ? r.kind === "감점" : DEDUCTION.test(r.text);
  return {
    deductions: reasons.filter(isDeduction).map((r) => r.text),
    credits: reasons.filter((r) => !isDeduction(r)).map((r) => r.text),
  };
}
/** AI가 추천하지 않은 기준: 직접 채점에 참고할 자료를 함께 보여줍니다. */
function ManualNote({ review, criterion }: { review: StudentReview; criterion: string | null }) {
  if (criterion === "CONTRIBUTION") {
    const contribution = review.analysisDetail?.contribution;
    const sentences = review.sentences ?? [];
    const aiSentences = sentences.filter(
      (s) => (s.teacherSource ?? (s.needsReview ? "DIRECT" : s.source)) === "AI",
    );
    const unsure = sentences.filter((s) => s.needsReview && !s.teacherSource).length;
    return (
      <>
        <p>
          글자가 얼마나 겹치는지만으로는 학생이 실제로 얼마나 기여했는지 알 수 없어서, 지금 채점 방식에서는 AI가 이
          기준의 점수를 추천하지 않아요. 아래 답안 분석을 참고해 직접 채점해주세요.
        </p>
        {contribution && (
          <p className="analysis-reason-text">
            답안의 {Math.round(contribution.direct)}%는 학생이 직접 썼고, {100 - Math.round(contribution.direct)}%는 AI
            답변을 사용했어요.
          </p>
        )}
        {aiSentences.length > 0 && (
          <div className="question-effects">
            <span className="evidence-caption">AI 답변을 사용한 문장 {aiSentences.length}개</span>
            {aiSentences.map((s) => (
              <q className="analysis-quote" key={s.id}>
                {s.text}
              </q>
            ))}
          </div>
        )}
        {unsure > 0 && (
          <p className="analysis-reason-text">출처가 애매한 문장 {unsure}개는 활동 탭에서 직접 정할 수 있어요.</p>
        )}
      </>
    );
  }
  return <p>AI가 추천할 근거가 부족해 직접 채점이 필요한 기준입니다.</p>;
}

/** 질문 문장에서 근거가 된 표현만 강조합니다. */
function withCues(text: string, cues: string[]) {
  if (!cues.length) return text;
  const pattern = new RegExp(`(${cues.map((cue) => cue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return text.split(pattern).map((part, index) =>
    cues.includes(part) ? (
      <mark className="question-cue" key={index}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

// 말풍선 미리보기에서 마크다운 기호를 걷어냅니다.
const plain = (text: string) => text.replace(/```\w*\n?/g, "").replace(/\*\*/g, "");
export function AnalysisModal({
  review,
  messages = [],
  onClose,
  onOpenConversation,
  answerTexts = [],
}: {
  review: StudentReview;
  messages?: Message[];
  /** 학생 답안(문항별 글). 대화의 AI 답변이 답안에 쓰였는지 찾는 데 씁니다. */
  answerTexts?: string[];
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
          {rubric.criteria.map((item) => {
            // 질문 하나하나가 이 기준에 어떤 영향을 줬는지(질문 용도 기준) 가점·감점 아래에 붙여 설명합니다.
            const effects = questionEffects(criterionKey(item.indicator) ?? item.name, review.purposeQuestions ?? []);
            const questionsOf = (kind: "가점" | "감점") => {
              const list = effects.filter((effect) => effect.kind === kind);
              if (!list.length) return null;
              return (
                <div className="question-effects">
                  <span className="evidence-caption">
                    {kind === "가점" ? "가점의 근거가 된 질문" : "감점의 원인이 된 질문"}
                  </span>
                  {list.map((effect) => (
                    <button
                      type="button"
                      className="question-effect"
                      key={effect.conversationId}
                      onClick={() => onOpenConversation?.(effect.conversationId, effect.quote)}
                      title="채팅에서 보기"
                    >
                      <span className="question-effect-head">
                        <span className="evidence-id">#{effect.conversationId}</span>
                        <span className="question-effect-quote">{withCues(effect.quote, effect.cues)}</span>
                      </span>
                      <span className="question-effect-why">
                        <b>{effect.purposeLabel}</b>로 본 근거:{" "}
                        {effect.cues.length
                          ? `${effect.cues.map((cue) => `“${cue}”`).join(", ")}라는 표현이 있어요. `
                          : ""}
                        {effect.why}
                      </span>
                      {effect.verdict && <span className="question-effect-verdict">{effect.verdict}</span>}
                      <span className="question-effect-result">{effect.effect}</span>
                    </button>
                  ))}
                </div>
              );
            };
            const isTransparency =
              criterionKey(item.indicator) === "TRANSPARENCY" || criterionKey(item.name) === "TRANSPARENCY";
            const hasUsedPartsDeduction = /답안 활용 부분 (X|미작성)/.test(item.ai?.reason ?? "");
            // 대화 하나의 AI 답변이 쓰인 답안 문장: 서버 판정(문장별 출처·대화 번호)이 있으면 그것을, 없으면 겹침 추정으로 찾습니다.
            const usedSentences = (conversationId: number, reply: string) => {
              const server = (review.sentences ?? []).filter(
                (s) => (s.teacherSource ?? (s.needsReview ? "DIRECT" : s.source)) === "AI",
              );
              if (server.length) {
                return server
                  .filter((s) => s.conversationId === conversationId)
                  .map((s) => s.text);
              }
              return reply ? estimateAiSentences(answerTexts.join("\n"), [reply]) : [];
            };
            // 근거 대화 목록. 투명성은 '질문 기록이 남아 있어요' 가점 바로 아래에 붙입니다.
            const evidenceList = (caption: string) => {
              const evidence = (item.ai?.evidence ?? []).filter((entry) => entry.conversationId !== undefined);
              if (!evidence.length) return null;
              if (isTransparency) {
                // 투명성: 질문마다 기록이 남아 있다는 점과, 그 대화의 AI 답변이 답안에 쓰였는지를 함께 보여줍니다.
                return (
                  <div className="question-effects">
                    <span className="evidence-caption">{caption}</span>
                    {evidence.map((entry, index) => {
                      const id = entry.conversationId as number;
                      const chat = findConversation(messages, id);
                      const used = usedSentences(id, chat?.reply?.content ?? "");
                      return (
                        <button
                          type="button"
                          className="question-effect"
                          key={index}
                          onClick={() => onOpenConversation?.(id, entry.quote)}
                          title="채팅에서 보기"
                        >
                          <span className="question-effect-head">
                            <span className="evidence-id">#{id}</span>
                            <span className="question-effect-quote">
                              {chat?.prompt ? plain(chat.prompt.content) : "AI 대화"}
                            </span>
                          </span>
                          <span className="question-effect-why">
                            <b>기록 확인</b> · 질문과 AI 답변이 LIT 대화 기록에 그대로 남아 있어, 어떤 도움을 받았는지 확인할 수 있어요.
                          </span>
                          <span className="question-effect-result">
                            {used.length
                              ? `이 대화의 AI 답변이 답안 문장 ${used.length}개에 쓰였어요. 예: “${used[0]}”${
                                  hasUsedPartsDeduction ? " 학생이 이 활용 부분을 따로 밝히지 않아 감점과 연결돼요." : ""
                                }`
                              : "이 대화의 AI 답변은 답안에 그대로 쓰이지 않았어요."}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              }
              return (
                <div className="question-effects">
                  <span className="evidence-caption">{caption}</span>
                  {evidence.map((entry, index) => {
                    const id = entry.conversationId as number;
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
                        <span className="evidence-text">{chat?.prompt ? plain(chat.prompt.content) : "AI 대화"}</span>
                        <span className="evidence-go" aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                </div>
              );
            };
            return (
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
                  {item.reasons?.length ? (
                    // AI 루브릭 판정: 가점·감점 이유를 제목·설명·원문 인용과 함께 보여줍니다.
                    (["가점", "감점"] as const).map((kind) => {
                      const list = (item.reasons ?? []).filter((r) => r.kind === kind);
                      if (!list.length) return null;
                      return (
                        <div className="analysis-group" key={kind}>
                          <span className={`analysis-tag ${kind === "감점" ? "is-deduction" : "is-credit"}`}>{kind}</span>
                          <ul className="analysis-reason-list">
                            {list.map((reason, index) => (
                              <li key={index}>
                                <strong>{reason.title}</strong>
                                <p className="analysis-reason-text">{reason.explanation}</p>
                                {reason.quotes.map((quote, qi) =>
                                  quote.conversationId !== null ? (
                                    <button
                                      type="button"
                                      className="evidence-row"
                                      key={qi}
                                      onClick={() => onOpenConversation?.(quote.conversationId as number, quote.text)}
                                      title="채팅에서 보기"
                                    >
                                      <span className="evidence-id">#{quote.conversationId}</span>
                                      <span className="evidence-text">“{quote.text}”</span>
                                      <span className="evidence-go" aria-hidden="true">›</span>
                                    </button>
                                  ) : (
                                    <q className="analysis-quote" key={qi}>{quote.text}</q>
                                  ),
                                )}
                              </li>
                            ))}
                          </ul>
                          {questionsOf(kind)}
                        </div>
                      );
                    })
                  ) : item.ai ? (
                    (() => {
                      const { reasons } = splitReason(
                        `AI 추천 ${levels[item.ai.level]} (${fmt(item.ai.score)}점) · ${item.ai.reason}`,
                      );
                      const { deductions, credits } = classify(reasons);
                      return [
                        { kind: "가점" as const, list: credits },
                        { kind: "감점" as const, list: deductions },
                      ]
                        .filter(
                          (group) => group.list.length > 0 || effects.some((effect) => effect.kind === group.kind),
                        )
                        .map((group) => (
                          <div className="analysis-group" key={group.kind}>
                            <span className={`analysis-tag ${group.kind === "감점" ? "is-deduction" : "is-credit"}`}>
                              {group.kind}
                            </span>
                            <ul className="analysis-reason-list">
                              {group.list.map((reason) => (
                                <li key={reason}>
                                  <p className="analysis-reason-text">{reason}</p>
                                </li>
                              ))}
                            </ul>
                            {questionsOf(group.kind)}
                            {isTransparency && group.kind === "가점" && evidenceList("기록으로 남은 질문")}
                          </div>
                        ));
                    })()
                  ) : (
                    <ManualNote review={review} criterion={criterionKey(item.indicator) ?? criterionKey(item.name)} />
                  )}
                  {!effects.length && !isTransparency && evidenceList("판단에 참고한 대화")}
                  {item.teacher?.feedback && <p>교사 의견: {item.teacher.feedback}</p>}
                </div>
              </div>
            </section>
            );
          })}
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
