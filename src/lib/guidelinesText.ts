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

const ALLOWED_TAGS = new Set([
  "P", "BR", "DIV", "SPAN", "STRONG", "B", "EM", "I", "U", "S", "H1", "H2", "H3", "H4",
  "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "CODE", "A", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "HR",
]);
const SAFE_LINK = /^(https?:|mailto:)/i;

/**
 * 평가 안내를 화면에 태그가 적용된 모습으로 보여 주기 위한 HTML을 만듭니다.
 * 허용한 태그만 남기고(스크립트·이벤트 속성 제거) 태그가 없는 예전 일반 텍스트는 줄 단위 문단으로 바꿉니다.
 */
export function guidelinesToSafeHtml(source: string): string {
  if (!source.trim()) return "";
  if (!/<[a-z][\s\S]*>/i.test(source)) return plainTextToHtml(source);
  const doc = new DOMParser().parseFromString(source, "text/html");
  const clean = (node: Node): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (!(child instanceof HTMLElement) || !ALLOWED_TAGS.has(child.tagName)) {
        // 허용하지 않는 태그는 내용만 남기고 태그는 제거(스크립트·스타일은 내용까지 제거).
        if (child instanceof HTMLElement && /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED)$/.test(child.tagName)) {
          child.remove();
        } else {
          clean(child);
          child.replaceWith(...Array.from(child.childNodes));
        }
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const keepHref = child.tagName === "A" && attr.name === "href" && SAFE_LINK.test(attr.value.trim());
        if (!keepHref) child.removeAttribute(attr.name);
      }
      if (child.tagName === "A") {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer");
      }
      clean(child);
    }
  };
  clean(doc.body);
  return doc.body.innerHTML;
}
