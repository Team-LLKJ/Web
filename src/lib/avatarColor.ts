// 구글 계정의 기본 프로필처럼 진한 단색 배경 + 흰 글자를 쓰기 위한 색 목록입니다.
export const AVATAR_COLORS = [
  "#1a73e8",
  "#d93025",
  "#188038",
  "#c26401",
  "#9334e6",
  "#d01884",
  "#129eaf",
  "#5f6368",
  "#a52714",
  "#185abc",
];

export function avatarColor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
