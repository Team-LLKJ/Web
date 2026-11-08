// 근거가 된 문장만 형광펜처럼 표시합니다. (CSS Custom Highlight API)
const NAME = "evidence-mark";

// 서버가 문장을 주지 않을 때, 대리 작성 요청에서 흔히 쓰는 표현을 대신 찾습니다.
const FALLBACK = /(풀어\s?(줘|주세요|줄래)|써\s?(줘|주세요|줄래)|작성(해|하여)\s?(줘|주세요)|대신\s?[^.\n]{0,20}|정답\s?[^.\n]{0,15}|답\s?(알려|좀)\s?[^.\n]{0,15}|해결해\s?(줘|주세요))/;

type Registry = { set(name: string, value: unknown): void; delete(name: string): void };

function registry(): Registry | undefined {
  return (CSS as unknown as { highlights?: Registry }).highlights;
}

export function clearEvidenceMark() {
  registry()?.delete(NAME);
}

/** root 안에서 quote(없으면 대리 작성 요청 표현)를 찾아 그 부분만 표시합니다. 표시했으면 true. */
export function markEvidence(root: HTMLElement, quote?: string): boolean {
  const reg = registry();
  const Ctor = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  if (!reg || !Ctor) return false;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; start: number }[] = [];
  let full = "";
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push({ node: node as Text, start: full.length });
    full += node.textContent ?? "";
  }
  let start = -1;
  let length = 0;
  const needle = quote?.trim();
  if (needle) {
    start = full.indexOf(needle);
    if (start < 0) start = full.replace(/\s+/g, " ").indexOf(needle.replace(/\s+/g, " "));
    length = needle.length;
  }
  if (start < 0) {
    const match = FALLBACK.exec(full);
    if (match) {
      start = match.index;
      length = match[0].length;
    }
  }
  // 긴 글을 통째로 붙여 넣은 질문은 키워드가 없어, 붙여 넣은 글의 첫 문장만 표시합니다.
  if (start < 0 && full.trim().length > 150) {
    const lead = full.search(/[가-힣A-Za-z]/);
    const first = full.slice(lead).search(/[.!?。]\s|\n/);
    start = Math.max(lead, 0);
    length = Math.min(first < 0 ? 80 : first + 1, 90);
  }
  if (start < 0) return false;
  const locate = (offset: number) => {
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      if (offset >= nodes[i].start) return { node: nodes[i].node, offset: offset - nodes[i].start };
    }
    return null;
  };
  const from = locate(start);
  const to = locate(Math.min(start + length, full.length));
  if (!from || !to) return false;
  const range = document.createRange();
  range.setStart(from.node, Math.min(from.offset, from.node.length));
  range.setEnd(to.node, Math.min(to.offset, to.node.length));
  reg.set(NAME, new Ctor(range));
  return true;
}
