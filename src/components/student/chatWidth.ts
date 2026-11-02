export const DEFAULT_CHAT_WIDTH = 32;
export const MIN_CHAT_WIDTH = 22;
export const MAX_CHAT_WIDTH = 40;
export const CHAT_WIDTH_KEY = "lit:student-chat-width:v2";

export const clampChatWidth = (width: number) =>
  Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, width));

export function readChatWidth(
  storageKey: string = CHAT_WIDTH_KEY,
  defaultWidth: number = DEFAULT_CHAT_WIDTH,
) {
  try {
    const saved = localStorage.getItem(storageKey);
    const width = saved === null ? defaultWidth : Number(saved);
    return Number.isFinite(width) ? clampChatWidth(width) : defaultWidth;
  } catch {
    return defaultWidth;
  }
}
