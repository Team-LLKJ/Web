// field-sizing: content 를 지원하지 않는 브라우저에서 textarea 높이를 내용에 맞춰 늘립니다.
export function installTextareaAutoGrow() {
  if (typeof window === "undefined") return;
  if (window.CSS?.supports?.("field-sizing", "content")) return;
  const grow = (el: HTMLTextAreaElement) => {
    const style = getComputedStyle(el);
    const border =
      style.boxSizing === "border-box"
        ? parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
        : 0;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + border}px`;
  };
  document.addEventListener("input", (event) => {
    if (event.target instanceof HTMLTextAreaElement) grow(event.target);
  });
  // 처음 그려질 때(저장된 값이 채워진 경우)도 맞춘다.
  new MutationObserver(() => {
    document.querySelectorAll("textarea").forEach((el) => {
      if (!el.style.height) grow(el);
    });
  }).observe(document.body, { childList: true, subtree: true });
}
