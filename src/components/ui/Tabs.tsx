import { useLayoutEffect, useRef, useState } from "react";

type Props<T extends string | number> = {
  label: string;
  value: T;
  items: readonly {
    value: T;
    label: string;
  }[];
  onChange: (value: T) => void;
  variant?: "underline" | "pill" | "segment";
};

type Thumb = { left: number; width: number; top: number; height: number } | null;

export function Tabs<T extends string | number>({
  label,
  value,
  items,
  onChange,
  variant = "underline",
}: Props<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb>(null);
  const [ready, setReady] = useState(false);
  const segment = variant === "segment";
  // 선택 표시가 탭 사이를 미끄러지듯 이동하는 변형 (세그먼트, 알약)
  const slider = segment || variant === "pill";

  useLayoutEffect(() => {
    if (!slider) return;
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[aria-selected="true"]');
      // Hidden (e.g. the chat is expanded full screen): keep the last position and
      // drop the transition so the thumb does not sweep in when we come back.
      if (!active || list.offsetWidth === 0) {
        setReady(false);
        return;
      }
      const next = {
        left: active.offsetLeft,
        width: active.offsetWidth,
        top: active.offsetTop,
        height: active.offsetHeight,
      };
      setThumb((current) =>
        current && current.left === next.left &&
        current.width === next.width &&
        current.top === next.top &&
        current.height === next.height
          ? current
          : next,
      );
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setReady(true));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [slider, value, items]);

  return (
    <div
      ref={listRef}
      className={
        variant === "pill"
          ? "detail-tabs"
          : segment
            ? "segment-tabs"
            : "question-tabs"
      }
      role="tablist"
      aria-label={label}
    >
      {slider && thumb && (
        <span
          className={`segment-thumb ${segment ? "" : "pill-thumb"} ${ready ? "is-ready" : ""}`}
          style={{
            width: thumb.width,
            transform: `translateX(${thumb.left}px)`,
            ...(segment ? {} : { top: thumb.top, height: thumb.height, bottom: "auto" }),
          }}
          aria-hidden="true"
        />
      )}
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={value === item.value ? "active" : ""}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
