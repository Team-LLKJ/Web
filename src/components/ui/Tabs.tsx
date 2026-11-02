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
  const [overflow, setOverflow] = useState({ prev: false, next: false });
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

  // 탭이 너무 많아 넘칠 때만 좌우 화살표를 보여줍니다 (세그먼트 변형).
  useLayoutEffect(() => {
    if (!segment) return;
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      const prev = list.scrollLeft > 1;
      const next = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
      setOverflow((current) =>
        current.prev === prev && current.next === next
          ? current
          : { prev, next },
      );
    };
    update();
    list.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [segment, items]);

  // 선택한 탭이 가려져 있으면 보이는 위치로 스크롤합니다.
  useLayoutEffect(() => {
    if (!segment) return;
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !active) return;
    const left = active.offsetLeft - 8;
    const right = active.offsetLeft + active.offsetWidth + 8;
    if (left < list.scrollLeft) list.scrollTo({ left, behavior: "smooth" });
    else if (right > list.scrollLeft + list.clientWidth)
      list.scrollTo({ left: right - list.clientWidth, behavior: "smooth" });
  }, [segment, value]);

  const scrollTabs = (direction: -1 | 1) => {
    const list = listRef.current;
    if (list)
      list.scrollBy({ left: direction * list.clientWidth * 0.7, behavior: "smooth" });
  };

  const tablist = (
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

  if (!segment) return tablist;
  const showArrows = overflow.prev || overflow.next;
  return (
    <div className="segment-tabs-wrap">
      {showArrows && (
        <button
          type="button"
          className="segment-tabs-arrow"
          aria-label="이전 탭 보기"
          disabled={!overflow.prev}
          onClick={() => scrollTabs(-1)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      )}
      {tablist}
      {showArrows && (
        <button
          type="button"
          className="segment-tabs-arrow"
          aria-label="다음 탭 보기"
          disabled={!overflow.next}
          onClick={() => scrollTabs(1)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
