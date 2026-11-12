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

/** 서버가 판정한 문장(출처 포함). 있으면 화면 추정 대신 이 문장들을 찾아 줄을 칩니다. */
export type KnownSentence = { text: string; kind: "ai" | "student" };

export function markAuthorship(
  root: HTMLElement,
  aiTexts: string[],
  kind: AuthorKind,
  userTexts: string[] = [],
  known: KnownSentence[] = [],
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
  const addRange = (start: number, end: number) => {
    const from = locate(start);
    const to = locate(end);
    if (!from || !to) return;
    const range = document.createRange();
    range.setStart(from.node, Math.min(from.offset, from.node.length));
    range.setEnd(to.node, Math.min(to.offset, to.node.length));
    ranges.push(range);
  };
  if (known.length) {
    // 공백을 뺀 글자끼리 비교해 서버 문장을 답안 화면에서 찾습니다(앞에서부터 차례로).
    const positions: number[] = [];
    let compact = "";
    for (let i = 0; i < full.length; i += 1) {
      if (/\s/.test(full[i])) continue;
      positions.push(i);
      compact += full[i];
    }
    let cursor = 0;
    for (const sentence of known) {
      const needle = sentence.text.replace(/\s/g, "");
      if (!needle) continue;
      let at = compact.indexOf(needle, cursor);
      if (at < 0) at = compact.indexOf(needle);
      if (at < 0) continue;
      cursor = at + needle.length;
      if (sentence.kind !== kind) continue;
      addRange(positions[at], positions[at + needle.length - 1] + 1);
    }
    if (ranges.length) reg.set(NAMES[kind], new Ctor(...ranges));
    return ranges.length;
  }
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


/** 답안에서 AI 답변을 사용한 것으로 추정되는 문장(서버 판정이 없을 때 화면 추정과 같은 기준 0.4). */
export function estimateAiSentences(answer: string, aiTexts: string[], userTexts: string[] = []) {
  const aiGrams = grams(aiTexts.join(" "));
  grams(userTexts.join(" ")).forEach((gram) => aiGrams.delete(gram));
  return [...answer.matchAll(/[^.!?。\n]+[.!?。]?/g)]
    .map((match) => match[0].trim())
    .filter((text) => text.replace(/\s/g, "").length >= 8 && overlap(text, aiGrams) >= 0.4);
}

const SOURCE = "author-ai-source";
export function clearAiSourceMark() {
  registry()?.delete(SOURCE);
}

/**
 * 대화창의 AI 말풍선에서, 답안이 가져간 것으로 보이는 문장에 배경을 칠합니다.
 * closest(서버가 고른 가장 가까운 AI 문장)가 있으면 그 문장을, 없으면 답안 문장과 가장 많이 겹치는 AI 문장을 찾습니다.
 * 칠한 첫 말풍선을 돌려줍니다.
 */
export function markAiSources(
  bubbles: HTMLElement[],
  sentences: { text: string; closest?: string | null }[],
): HTMLElement | null {
  const reg = registry();
  const Ctor = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  clearAiSourceMark();
  if (!reg || !Ctor || !sentences.length) return null;
  type Piece = { bubble: HTMLElement; text: string; range: () => Range | null };
  const pieces: Piece[] = [];
  for (const bubble of bubbles) {
    const walker = document.createTreeWalker(bubble, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; start: number }[] = [];
    let full = "";
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      nodes.push({ node: node as Text, start: full.length });
      full += node.textContent ?? "";
    }
    const locate = (offset: number) => {
      for (let i = nodes.length - 1; i >= 0; i -= 1) {
        if (offset >= nodes[i].start) return { node: nodes[i].node, offset: offset - nodes[i].start };
      }
      return null;
    };
    for (const match of full.matchAll(/[^.!?。\n]+[.!?。]?/g)) {
      const text = match[0];
      if (text.replace(/\s/g, "").length < 8) continue;
      const lead = text.length - text.trimStart().length;
      const start = match.index + lead;
      const end = match.index + text.trimEnd().length;
      pieces.push({
        bubble,
        text: text.trim(),
        range: () => {
          const from = locate(start);
          const to = locate(end);
          if (!from || !to) return null;
          const range = document.createRange();
          range.setStart(from.node, Math.min(from.offset, from.node.length));
          range.setEnd(to.node, Math.min(to.offset, to.node.length));
          return range;
        },
      });
    }
  }
  const compact = (text: string) => text.replace(/[\s*_`#>]/g, "");
  const picked = new Set<Piece>();
  for (const sentence of sentences) {
    let best: Piece | null = null;
    const closest = sentence.closest ? compact(sentence.closest) : "";
    if (closest) {
      best =
        pieces.find((piece) => {
          const own = compact(piece.text);
          return own.includes(closest) || closest.includes(own);
        }) ?? null;
    }
    if (!best) {
      const target = grams(sentence.text);
      let top = 0;
      for (const piece of pieces) {
        // 답안 문장의 몇 %가 이 AI 문장과 겹치는지
        const own = grams(piece.text);
        let hit = 0;
        target.forEach((gram) => own.has(gram) && (hit += 1));
        const score = target.size ? hit / target.size : 0;
        if (score > top) {
          top = score;
          best = piece;
        }
      }
      if (top < 0.3) best = null;
    }
    if (best) picked.add(best);
  }
  const ranges = [...picked].map((piece) => piece.range()).filter((range): range is Range => range !== null);
  if (ranges.length) reg.set(SOURCE, new Ctor(...ranges));
  return [...picked][0]?.bubble ?? null;
}
