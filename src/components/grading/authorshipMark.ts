// 답안에서 학생이 직접 쓴 문장 / AI 답변과 비슷한 문장에 줄을 쳐 보여줍니다. (CSS Custom Highlight API)
// 서버가 문장별 정보를 주지 않아, 대화 속 AI 답변과 문장이 얼마나 겹치는지로 브라우저에서 추정합니다.
export type AuthorKind = "student" | "ai" | "paste";
const NAMES: Record<AuthorKind, string> = {
  student: "author-student",
  ai: "author-ai",
  paste: "author-paste",
};
type Registry = { set(name: string, value: unknown): void; delete(name: string): void };
const registry = () => (CSS as unknown as { highlights?: Registry }).highlights;

export function clearAuthorMark() {
  const reg = registry();
  reg?.delete(NAMES.student);
  reg?.delete(NAMES.ai);
  reg?.delete(NAMES.paste);
}

const grams = (text: string, n = 4) => {
  const compact = text.replace(/[\s.,!?"'()[\]]/g, "");
  const set = new Set<string>();
  for (let i = 0; i + n <= compact.length; i += 1) set.add(compact.slice(i, i + n));
  return set;
};

/** 문장이 AI 답변과 겹치는 비율 (0~1) */
function overlap(sentence: string, aiGrams: Set<string>) {
  const own = grams(sentence);
  if (!own.size) return 0;
  let hit = 0;
  own.forEach((gram) => aiGrams.has(gram) && (hit += 1));
  return hit / own.size;
}

export function markAuthorship(
  root: HTMLElement,
  aiTexts: string[],
  kind: AuthorKind,
  userTexts: string[] = [],
): number {
  const reg = registry();
  const Ctor = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  clearAuthorMark();
  if (!reg || !Ctor) return 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; start: number }[] = [];
  let full = "";
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push({ node: node as Text, start: full.length });
    full += node.textContent ?? "";
  }
  // AI 답변이 학생이 쓴 글을 그대로 되풀이한 부분은 AI의 글이 아니므로, 학생 질문에 이미 있던 표현은 뺍니다.
  const aiGrams = grams(aiTexts.join(" "));
  grams(userTexts.join(" ")).forEach((gram) => aiGrams.delete(gram));
  const locate = (offset: number) => {
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      if (offset >= nodes[i].start) return { node: nodes[i].node, offset: offset - nodes[i].start };
    }
    return null;
  };
  const ranges: Range[] = [];
  for (const match of full.matchAll(/[^.!?。\n]+[.!?。]?/g)) {
    const text = match[0];
    if (text.replace(/\s/g, "").length < 8) continue;
    // 0.4 이상이면 AI 답변을 사용한 문장(그대로 옮긴 문장 포함)
    const score = overlap(text, aiGrams);
    const own: AuthorKind = score >= 0.4 ? "ai" : "student";
    if (own !== kind) continue;
    const lead = text.length - text.trimStart().length;
    const from = locate(match.index + lead);
    const to = locate(match.index + text.trimEnd().length);
    if (!from || !to) continue;
    const range = document.createRange();
    range.setStart(from.node, Math.min(from.offset, from.node.length));
    range.setEnd(to.node, Math.min(to.offset, to.node.length));
    ranges.push(range);
  }
  if (ranges.length) reg.set(NAMES[kind], new Ctor(...ranges));
  return ranges.length;
}
