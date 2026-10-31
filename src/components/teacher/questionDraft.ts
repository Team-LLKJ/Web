import type { QuestionInput } from "../../api/types";

export type DraftQuestion = QuestionInput & { key: string };
export const freshQuestion = (position: number): DraftQuestion => ({
  key: crypto.randomUUID(),
  position,
  title: `문항 ${position}`,
  content: "",
});
export const toDraftQuestion = (question: QuestionInput): DraftQuestion => ({
  key: crypto.randomUUID(),
  position: question.position,
  title: question.title,
  content: question.content,
});
// 문항 제목 입력은 없애고 순서대로 "문항 N"을 서버에 보냅니다.
export const toQuestionInput = (
  question: DraftQuestion,
  index: number,
): QuestionInput => ({
  position: index + 1,
  title: `문항 ${index + 1}`,
  content: question.content.trim(),
});
export const moveQuestion = (
  questions: DraftQuestion[],
  fromKey: string,
  toIndex: number,
) => {
  const fromIndex = questions.findIndex((question) => question.key === fromKey);
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    toIndex >= questions.length ||
    fromIndex === toIndex
  )
    return questions;
  const next = [...questions];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((question, index) => ({ ...question, position: index + 1 }));
};
