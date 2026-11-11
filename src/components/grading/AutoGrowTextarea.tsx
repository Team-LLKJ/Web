import { useCallback, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/** 글 줄 수에 맞춰 높이가 늘고 줄어드는 입력칸. 안에는 스크롤이 생기지 않습니다. */
export function AutoGrowTextarea({
  value,
  className = "",
  onInput,
  onCompositionEnd,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const grow = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    // 테두리 두께까지 더해 마지막 줄이 잘리지 않게 합니다.
    element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
    element.scrollTop = 0;
  }, []);

  // 값이 바뀌거나(저장된 근거 불러오기 포함) 처음 그려질 때
  useLayoutEffect(grow, [value, grow]);

  // 칸 너비가 바뀌면(패널 크기 조절, 화면 회전) 줄 수가 달라지므로 다시 잽니다.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      grow();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [grow]);

  return (
    <textarea
      {...rest}
      ref={ref}
      className={`auto-grow ${className}`}
      rows={1}
      value={value}
      // 한글 입력 중(조합 중)에도 키를 누를 때마다 바로 높이를 맞춥니다.
      onInput={(event) => {
        grow();
        onInput?.(event);
      }}
      onCompositionEnd={(event) => {
        requestAnimationFrame(grow);
        onCompositionEnd?.(event);
      }}
    />
  );
}
