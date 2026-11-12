import type { PurposeType } from "../../api/types";
import type { StudentReview } from "../../data/review";

/** 질문을 문장 안에 넣기 좋게 줄입니다. */
const cite = (text: string) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return `“${clean.length > 40 ? `${clean.slice(0, 38)}…` : clean}”`;
};

// 용도별로 학생 질문을 들어 잘한 점·아쉬운 점을 문장으로 씁니다.
const GOOD: Partial<Record<PurposeType, (quote: string) => string>> = {
  REVIEW: (q) => `${q}라고 물으며 AI가 알려 준 내용이 맞는지, 근거가 있는지 스스로 확인했어요.`,
  UNDERSTAND: (q) => `${q}처럼 답을 받기보다 필요한 내용을 먼저 이해하려고 질문했어요.`,
  PLAN: (q) => `${q}처럼 무엇을 어떻게 쓸지 방향을 잡는 데 AI를 활용했어요.`,
};
const BAD: Partial<Record<PurposeType, (quote: string) => string>> = {
  DRAFT: (q) => `${q}처럼 답안에 들어갈 내용을 AI에게 대신 써 달라고 요청했어요.`,
};

/** 분석 결과를 잘한 점·아쉬운 점 문장으로 정리합니다. 정리할 자료가 없으면 서버 요약을 그대로 보여줍니다. */
export function ReviewSummary({ review }: { review: StudentReview }) {
  const good: string[] = [];
  const bad: string[] = [];
  const questions = review.purposeQuestions ?? [];
  for (const q of questions) {
    const purpose = q.teacherPurpose ?? q.purpose;
    if (purpose === "UNDECIDED") continue;
    const quote = cite(q.quote);
    const goodLine = GOOD[purpose]?.(quote);
    const badLine = BAD[purpose]?.(quote);
    if (goodLine) good.push(goodLine);
    if (badLine) bad.push(badLine);
  }

  const contribution = review.analysisDetail?.contribution;
  const sentences = review.sentences ?? [];
  const aiSentences = sentences.filter((s) => (s.teacherSource ?? (s.needsReview ? "DIRECT" : s.source)) === "AI");
  if (contribution) {
    const direct = Math.round(contribution.direct);
    if (direct >= 70) good.push(`답안의 ${direct}%를 자신의 말로 직접 작성했어요.`);
    if (100 - direct > 0) {
      bad.push(
        aiSentences.length
          ? `답안 문장 ${aiSentences.length}개(${100 - direct}%)는 AI 답변을 거의 그대로 가져왔어요. 예: ${cite(aiSentences[0].text)}`
          : `답안의 ${100 - direct}%는 AI 답변과 비슷한 문장이에요.`,
      );
    }
  }
  const compliance = review.analysisDetail?.compliance?.result;
  if (compliance === "VIOLATION") bad.push("허용된 범위를 넘어 AI를 사용했어요.");

  const checks: string[] = [];
  if (compliance === "CHECK") checks.push("허용 범위를 넘었는지");
  const unsureSentences = sentences.filter((s) => s.needsReview && !s.teacherSource).length;
  const unsurePurposes = questions.filter((q) => q.needsReview && !q.teacherPurpose).length;
  const manualCriteria = (review.rubric?.criteria ?? []).filter((c) => c.needsReview).length;
  if (unsureSentences) checks.push(`출처가 애매한 문장 ${unsureSentences}개`);
  if (unsurePurposes) checks.push(`용도가 애매한 질문 ${unsurePurposes}개`);
  if (manualCriteria) checks.push(`직접 채점할 루브릭 항목 ${manualCriteria}개`);

  if (!good.length && !bad.length && !checks.length) {
    return <p>{review.analysisDetail?.summary?.trim() || review.summary}</p>;
  }
  return (
    <div className="review-summary">
      {good.length > 0 && (
        <div>
          <h4 className="review-summary-good">잘한 점</h4>
          <p>{good.join(" ")}</p>
        </div>
      )}
      {bad.length > 0 && (
        <div>
          <h4 className="review-summary-bad">아쉬운 점</h4>
          <p>{bad.join(" ")}</p>
        </div>
      )}
      {checks.length > 0 && (
        <p className="review-summary-check">선생님 확인이 필요해요: {checks.join(", ")}.</p>
      )}
    </div>
  );
}
