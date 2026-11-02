import type { QuestionInput } from "../../api/types";

export type DraftQuestion = Omit<QuestionInput, "minChars" | "maxChars"> & {
  key: string;
  /** 입력 중인 값(빈 문자열이면 제한 없음). */
  minChars: string;
  maxChars: string;
};
export const MAX_QUESTION_CHARS = 10000;
export const freshQuestion = (position: number): DraftQuestion => ({
  key: crypto.randomUUID(),
  position,
  title: `문항 ${position}`,
  content: "",
  minChars: "",
  maxChars: "",
});
export const toDraftQuestion = (question: QuestionInput): DraftQuestion => ({
  key: crypto.randomUUID(),
  position: question.position,
  title: question.title,
  content: question.content,
  minChars: question.minChars ? String(question.minChars) : "",
  maxChars: question.maxChars ? String(question.maxChars) : "",
});
// 문항 제목 입력은 없애고 순서대로 "문항 N"을 서버에 보냅니다.
export const toQuestionInput = (
  question: DraftQuestion,
  index: number,
): QuestionInput => ({
  position: index + 1,
  title: `문항 ${index + 1}`,
  content: question.content.trim(),
  ...(question.minChars ? { minChars: Number(question.minChars) } : {}),
  ...(question.maxChars ? { maxChars: Number(question.maxChars) } : {}),
});
/** 글자 수 제한이 올바르지 않으면 안내 문구를 돌려줍니다. */
export const questionLimitError = (questions: DraftQuestion[]) => {
  for (const [index, question] of questions.entries()) {
    const min = question.minChars === "" ? null : Number(question.minChars);
    const max = question.maxChars === "" ? null : Number(question.maxChars);
    const label = `문항 ${index + 1}`;
    for (const value of [min, max]) {
      if (
        value !== null &&
        (!Number.isInteger(value) || value < 1 || value > MAX_QUESTION_CHARS)
      )
        return `${label}의 글자 수는 1~${MAX_QUESTION_CHARS.toLocaleString()} 사이의 숫자로 입력해주세요.`;
    }
    if (min !== null && max !== null && min > max)
      return `${label}의 최소 글자 수는 최대 글자 수보다 클 수 없어요.`;
  }
  return "";
};
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
