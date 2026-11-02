export const MAX_ANSWER_LENGTH = 10_000;
export const DEFAULT_FONT_SIZE = 18;
export const DEFAULT_FONT_FAMILY = "Pretendard";
export const MAX_ANSWER_HTML_LENGTH = 1_000_000;
const EMPTY_CARET = "\u200B";
const ALLOWED_TAGS = new Set([
  "P",
  "DIV",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",
  "UL",
  "OL",
  "LI",
  "H2",
  "H3",
  "H4",
  "BLOCKQUOTE",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TR",
  "TH",
  "TD",
  "SPAN",
  "A",
  "IMG",
  "HR",
  "H1",
  "MARK",
  "SUP",
  "SUB",
  "PRE",
  "CODE",
  "COLGROUP",
  "COL",
  "LABEL",
  "INPUT",
]);

export const FONT_FAMILIES: Record<string, string> = {
  pretendard: DEFAULT_FONT_FAMILY,
  "맑은 고딕": "맑은 고딕",
  굴림: "굴림",
  바탕: "바탕",
  arial: "Arial",
  "times new roman": "Times New Roman",
  georgia: "Georgia",
  verdana: "Verdana",
  "courier new": "Courier New",
};

function safeStyleValue(property: string, value: string) {
  const normalized = value.trim().toLowerCase();
  if (property === "font-family") {
    const name = normalized.split(",")[0].replace(/["']/g, "").trim();
    return FONT_FAMILIES[name] ?? "";
  }
  if (property === "font-size") {
    const match = normalized.match(/^(\d+(?:\.\d+)?)(px|pt)$/);
    if (!match) return "";
    const pixels = Number(match[1]) * (match[2] === "pt" ? 4 / 3 : 1);
    return `${Math.round(Math.max(8, Math.min(96, pixels)) * 100) / 100}px`;
  }
  if (["margin-top", "margin-bottom"].includes(property))
    return /^(?:0|4|8|12|16|20|24)px$/.test(normalized) ? normalized : "";
  if (property === "margin-left")
    return /^(?:0|24|48|72|96|120|144)px$/.test(normalized) ? normalized : "";
  if (["width", "min-width"].includes(property))
    return /^(?:\d{1,4}(?:\.\d+)?px|100%)$/.test(normalized) ? normalized : "";
  if (property === "font-weight")
    return /^(?:normal|bold|[4-9]00)$/.test(normalized) ? normalized : "";
  if (property === "font-style")
    return /^(?:normal|italic|oblique)$/.test(normalized) ? normalized : "";
  if (property === "text-align")
    return /^(?:left|center|right|justify)$/.test(normalized) ? normalized : "";
  if (property === "line-height")
    return /^(?:normal|[1-3](?:\.\d{1,2})?)$/.test(normalized)
      ? normalized
      : "";
  if (property === "text-decoration")
    return /^(?:none|underline|line-through)(?:\s+(?:underline|line-through))*$/.test(
      normalized,
    )
      ? normalized
      : "";
  if (property === "color" || property === "background-color") {
    return CSS.supports(property, normalized) && !normalized.includes("url(")
      ? normalized
      : "";
  }
  return "";
}

function safeHref(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : "";
  } catch {
    return "";
  }
}

export function sanitizeAnswerHtml(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("*").forEach((element) => {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      if (
        ["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "MATH"].includes(
          element.tagName,
        )
      ) {
        element.remove();
      } else {
        element.replaceWith(...Array.from(element.childNodes));
      }
      return;
    }
    if (
      element.tagName === "INPUT" &&
      element.getAttribute("type") !== "checkbox"
    ) {
      element.remove();
      return;
    }
    if (element.tagName === "IMG") {
      const src = element.getAttribute("src") ?? "";
      if (
        src.length > 180_000 ||
        !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(src)
      ) {
        element.remove();
        return;
      }
    }
    Array.from(element.attributes).forEach((attribute) => {
      const isCellSpan =
        (element.tagName === "TD" || element.tagName === "TH") &&
        ["colspan", "rowspan"].includes(attribute.name.toLowerCase()) &&
        /^\d{1,2}$/.test(attribute.value);
      const isImageAttribute =
        element.tagName === "IMG" &&
        (attribute.name === "src" ||
          (attribute.name === "alt" && attribute.value.length <= 200) ||
          (attribute.name === "width" &&
            /^\d{1,4}$/.test(attribute.value) &&
            Number(attribute.value) <= 1600));
      const isEditorAttribute =
        (["UL", "LI"].includes(element.tagName) &&
          attribute.name === "data-type" &&
          ["taskList", "taskItem"].includes(attribute.value)) ||
        (element.tagName === "LI" &&
          attribute.name === "data-checked" &&
          ["true", "false"].includes(attribute.value)) ||
        (["P", "H1", "H2", "H3", "H4"].includes(element.tagName) &&
          attribute.name === "data-indent" &&
          /^[0-6]$/.test(attribute.value)) ||
        (["TD", "TH"].includes(element.tagName) &&
          attribute.name === "colwidth" &&
          /^\d{1,4}(?:,\d{1,4})*$/.test(attribute.value)) ||
        (element.tagName === "INPUT" &&
          ["type", "checked", "disabled"].includes(attribute.name)) ||
        (element.tagName === "IMG" &&
          attribute.name === "height" &&
          /^\d{1,4}$/.test(attribute.value));
      const isSafeLink =
        element.tagName === "A" && attribute.name.toLowerCase() === "href";
      if (attribute.name.toLowerCase() === "style") {
        const safeStyles: string[] = [];
        const style = (element as HTMLElement).style;
        [
          "font-family",
          "font-size",
          "font-weight",
          "font-style",
          "text-align",
          "line-height",
          "text-decoration",
          "color",
          "background-color",
          "margin-left",
          "margin-top",
          "margin-bottom",
          ...(["TABLE", "COL", "IMG"].includes(element.tagName)
            ? ["width", "min-width"]
            : []),
        ].forEach((property) => {
          const safeValue = safeStyleValue(
            property,
            style.getPropertyValue(property),
          );
          if (safeValue) safeStyles.push(`${property}: ${safeValue}`);
        });
        if (safeStyles.length)
          element.setAttribute("style", safeStyles.join("; "));
        else element.removeAttribute("style");
      } else if (isSafeLink) {
        const href = safeHref(attribute.value);
        if (href) element.setAttribute("href", href);
        else element.removeAttribute("href");
      } else if (!isCellSpan && !isImageAttribute && !isEditorAttribute) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  const textNodes = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_TEXT,
  );
  let textNode: Node | null;
  while ((textNode = textNodes.nextNode()))
    textNode.textContent =
      textNode.textContent?.replaceAll(EMPTY_CARET, "") ?? "";
  if (
    !template.content.textContent?.trim() &&
    !template.content.querySelector("table, img, hr")
  )
    return "";
  return template.innerHTML;
}

export function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

export function editorHtmlFromContent(content: string) {
  if (!content) return "";
  if (
    /<\s*(?:p|div|br|strong|b|em|i|u|s|ul|ol|li|h[1-4]|blockquote|table|thead|tbody|tr|th|td|span|a|img|hr|mark|sup|sub|pre|code)\b/i.test(
      content,
    )
  ) {
    return sanitizeAnswerHtml(content);
  }
  return content
    .split(/\r?\n/)
    .map((line) => `<p>${line ? escapeHtml(line) : "<br>"}</p>`)
    .join("");
}
