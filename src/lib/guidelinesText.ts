/** 서버는 안내(guidelines)를 일반 텍스트(최대 10,000자)로만 저장하므로 에디터 HTML과 서로 변환합니다. */
export const GUIDELINES_MAX_LENGTH = 10000;

const BLOCK_TAGS = new Set(["P", "DIV", "LI", "TR", "H1", "H2", "H3", "H4", "BLOCKQUOTE", "PRE"]);

export function htmlToPlainText(html: string): string {
  if (!html.trim()) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  let out = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") {
      out += "\n";
      return;
    }
    if (node.tagName === "TD" || node.tagName === "TH") {
      node.childNodes.forEach(walk);
      out += node.nextElementSibling ? " | " : "";
      return;
    }
    node.childNodes.forEach(walk);
    if (BLOCK_TAGS.has(node.tagName) && !out.endsWith("\n")) out += "\n";
  };
  doc.body.childNodes.forEach(walk);
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function plainTextToHtml(text: string): string {
  if (!text.trim()) return "";
  return text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}
