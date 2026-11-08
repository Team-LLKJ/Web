import type { Message } from "../../data/grading";

/** 평가 근거의 대화 번호에 해당하는 학생 질문과 그에 이어지는 AI 답변을 찾습니다. */
export function findConversation(messages: Message[], conversationId: number) {
  const key = String(conversationId);
  const token = new RegExp(`(^|\\D)${key}(\\D|$)`);
  const index = messages.findIndex((message) => message.id === key);
  const found = index >= 0 ? index : messages.findIndex((message) => token.test(message.id));
  if (found < 0) return null;
  const first = messages[found];
  // 번호가 AI 답변을 가리키면 바로 앞의 학생 질문을 함께 보여줍니다.
  const prompt = first.role === "user" ? first : messages[found - 1];
  const reply =
    first.role === "ai"
      ? first
      : messages.slice(found + 1).find((message) => message.role === "ai");
  return {
    prompt: prompt?.role === "user" ? prompt : undefined,
    reply: reply?.role === "ai" ? reply : undefined,
  };
}
