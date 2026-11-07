import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/** 글 줄 수에 맞춰 높이가 늘고 줄어드는 입력칸. 안에는 스크롤이 생기지 않습니다. */
export function AutoGrowTextarea({
  value,
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    // 테두리 두께까지 더해 마지막 줄이 잘리지 않게 합니다.
    element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
  }, [value]);
  return <textarea {...rest} ref={ref} className={`auto-grow ${className}`} rows={1} value={value} />;
}
