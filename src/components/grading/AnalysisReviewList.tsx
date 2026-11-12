import type { AnalysisSentence, PurposeQuestion, PurposeType } from "../../api/types";
import { Button } from "../ui/Button";
import { Dropdown } from "../ui/Dropdown";
import { PURPOSE_LABELS } from "./purposeLabels";

const PURPOSE_OPTIONS = (["UNDERSTAND", "PLAN", "REVIEW", "EDIT", "DRAFT", "OTHER"] as const).map((value) => ({
  value,
  label: PURPOSE_LABELS[value],
}));

/** AI가 출처를 확신하지 못한 답안 문장: 교사가 'AI 답변 사용' 또는 '직접 작성'으로 정합니다. */
export function SentenceReviewList({
  sentences,
  onSource,
}: {
  sentences: AnalysisSentence[];
  onSource?: (sentenceId: string, source: "AI" | "DIRECT") => void;
}) {
  const pending = sentences.filter((s) => s.needsReview && !s.teacherSource);
  if (!pending.length) return null;
  return (
    <div className="analysis-review">
      <h4>
        확인이 필요한 문장 <span>{pending.length}개</span>
      </h4>
      <p className="analysis-review-hint">AI 답변과 비슷한지 판단이 애매한 문장이에요. 정하기 전에는 직접 작성으로 계산돼요.</p>
      <ul>
        {pending.map((sentence) => (
          <li key={sentence.id}>
            <q>{sentence.text}</q>
            {sentence.closestAiSentence && (
              <p className="analysis-review-ref">비슷한 AI 답변: {sentence.closestAiSentence}</p>
            )}
            {onSource && (
              <div className="analysis-review-actions">
                <Button size="small" variant="secondary" onClick={() => onSource(sentence.id, "AI")}>
                  AI 답변 사용
                </Button>
                <Button size="small" variant="secondary" onClick={() => onSource(sentence.id, "DIRECT")}>
                  직접 작성
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** AI 판정이 엇갈린 질문: 참고 판정을 보고 교사가 용도를 고릅니다. */
export function PurposeReviewList({
  questions,
  onPurpose,
}: {
  questions: PurposeQuestion[];
  onPurpose?: (conversationId: number, purpose: PurposeType) => void;
}) {
  const pending = questions.filter((q) => q.needsReview && !q.teacherPurpose);
  if (!pending.length) return null;
  return (
    <div className="analysis-review">
      <h4>
        용도 확인이 필요한 질문 <span>{pending.length}개</span>
      </h4>
      <p className="analysis-review-hint">AI 판정이 엇갈린 질문이에요. 용도를 정하면 비율에 반영돼요.</p>
      <ul>
        {pending.map((question) => {
          const votes = question.votes
            .map((vote) => PURPOSE_LABELS[vote as PurposeType] ?? vote)
            .join(" · ");
          return (
            <li key={question.conversationId}>
              <q>{question.quote}</q>
              <p className="analysis-review-ref">
                참고: Gemini {votes || "-"}
                {question.haikuPurpose && ` / Haiku ${PURPOSE_LABELS[question.haikuPurpose]}`}
              </p>
              {onPurpose && (
                <div className="analysis-review-actions">
                  <Dropdown
                    label="질문 용도 선택"
                    value={question.purpose === "UNDECIDED" ? "" : question.purpose}
                    options={[
                      ...(question.purpose === "UNDECIDED" ? [{ value: "", label: "용도 선택" }] : []),
                      ...PURPOSE_OPTIONS,
                    ]}
                    onChange={(value) => value && onPurpose(question.conversationId, value as PurposeType)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
