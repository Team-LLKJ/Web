import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

// 좁은 화면(600px 이하)인지. 탭이 많을 때 셀렉트로 바꾸는 데 씁니다.
const NARROW = "(max-width: 600px)";
function subscribeNarrow(callback: () => void) {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const isNarrow = () => window.matchMedia(NARROW).matches;
/** 좁은 화면에서 세그먼트 탭이 이 개수 이상이면 '이전 · 셀렉트 · 다음' 으로 바꿉니다. */
const COMPACT_MIN_TABS = 4;

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const segment = variant === "segment";
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);
  const compact = segment && narrow && items.length >= COMPACT_MIN_TABS;
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
  }, [slider, value, items, compact]);

  // 탭이 너무 많아 넘칠 때만 좌우 화살표를 보여줍니다 (세그먼트 변형).
  useLayoutEffect(() => {
    if (!segment) return;
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      // 스크롤 길이가 아니라 탭 위치로 판단합니다. 끝에 빈 공간을 두므로 scrollWidth는 쓰지 않아요.
      const tabs = list.querySelectorAll<HTMLElement>('[role="tab"]');
      const first = tabs[0];
      const last = tabs[tabs.length - 1];
      if (!first || !last) return;
      // 화면에 실제로 그려진 위치로 비교합니다(offsetParent 차이에 영향받지 않아요).
      const box = list.getBoundingClientRect();
      const prev = first.getBoundingClientRect().left < box.left - 4;
      const next = last.getBoundingClientRect().right > box.right + 4;
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
  }, [segment, items, compact]);

  // 문항 목록(셀렉트)을 연 상태에서 바깥을 누르거나 Esc 를 누르면 닫습니다.
  useEffect(() => {
    if (!pickerOpen) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setPickerOpen(false);
        return;
      }
      if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [pickerOpen]);

  // 마지막 탭까지 한 화면에 다 들어오는 가장 앞쪽 탭의 위치. 이보다 더 넘기면 빈 화면만 늘어나요.
  const maxStart = (list: HTMLElement) => {
    const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')];
    const last = tabs[tabs.length - 1];
    if (!last) return 0;
    const end = last.offsetLeft + last.offsetWidth;
    const first = tabs.find((tab) => end - tab.offsetLeft <= list.clientWidth);
    return first ? first.offsetLeft : 0;
  };

  // 선택한 탭이 가려져 있으면 보이는 위치로 스크롤합니다.
  useLayoutEffect(() => {
    if (!segment) return;
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !active) return;
    // 가려진 탭은 그 탭이 맨 앞에 오도록 맞춰서, 다른 탭이 반쯤 잘려 보이지 않게 합니다.
    const hiddenLeft = active.offsetLeft < list.scrollLeft;
    const hiddenRight = active.offsetLeft + active.offsetWidth > list.scrollLeft + list.clientWidth;
    if (hiddenLeft || hiddenRight)
      list.scrollTo({
        left: active.offsetLeft < 8 ? 0 : Math.min(active.offsetLeft, maxStart(list)),
        behavior: "smooth",
      });
  }, [segment, value, compact]);

  // 탭이 중간에 잘린 채로 멈추지 않도록, 한 번에 보이는 만큼을 탭 단위로 넘깁니다.
  const scrollTabs = (direction: -1 | 1) => {
    const list = listRef.current;
    if (!list) return;
    const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')];
    let left: number;
    if (direction === 1) {
      const edge = list.scrollLeft + list.clientWidth;
      const first = tabs.find((tab) => tab.offsetLeft + tab.offsetWidth > edge + 1);
      left = first ? first.offsetLeft : list.scrollWidth;
    } else {
      const hidden = [...tabs].reverse().find((tab) => tab.offsetLeft < list.scrollLeft - 1);
      left = hidden ? hidden.offsetLeft + hidden.offsetWidth - list.clientWidth : 0;
      // 화면에 처음 들어오는 탭이 잘리지 않게, 그 탭의 시작에 맞춥니다.
      const aligned = tabs.find((tab) => tab.offsetLeft >= left - 1);
      if (aligned) left = aligned.offsetLeft;
    }
    list.scrollTo({ left: left < 8 ? 0 : Math.min(left, maxStart(list)), behavior: "smooth" });
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
  if (compact) {
    const index = items.findIndex((item) => item.value === value);
    const move = (offset: number) => {
      const target = items[index + offset];
      if (target) onChange(target.value);
    };
    const arrow = (direction: -1 | 1) => (
      <button
        type="button"
        className="tabs-stepper-arrow"
        aria-label={direction < 0 ? "이전" : "다음"}
        disabled={direction < 0 ? index <= 0 : index >= items.length - 1}
        onClick={() => move(direction)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={direction < 0 ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
        </svg>
      </button>
    );
    return (
      <div className="tabs-stepper" role="group" aria-label={label}>
        {arrow(-1)}
        <div className="tabs-stepper-picker" ref={pickerRef}>
          <button
            type="button"
            className="tabs-stepper-trigger"
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
            aria-label={label}
            onClick={() => setPickerOpen((open) => !open)}
          >
            <span className="tabs-stepper-current">{items[index]?.label}</span>
          </button>
          {pickerOpen && (
            <ul className="tabs-stepper-list" role="listbox" aria-label={label}>
              {items.map((item) => (
                <li key={String(item.value)} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={item.value === value}
                    className={item.value === value ? "active" : ""}
                    onClick={() => {
                      setPickerOpen(false);
                      onChange(item.value);
                    }}
                  >
                    <span>{item.label}</span>
                    {item.value === value && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {arrow(1)}
      </div>
    );
  }
  const showArrows = overflow.prev || overflow.next;
  return (
    <div className={`segment-tabs-wrap${showArrows ? " has-arrows" : ""}${overflow.prev ? " can-prev" : ""}${overflow.next ? " can-next" : ""}`}>
      {showArrows && (
        <button
          type="button"
          className={`segment-tabs-arrow${overflow.prev ? "" : " is-hidden"}`}
          aria-label="이전 탭 보기"
          aria-hidden={!overflow.prev}
          tabIndex={overflow.prev ? 0 : -1}
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
          className={`segment-tabs-arrow${overflow.next ? "" : " is-hidden"}`}
          aria-label="다음 탭 보기"
          aria-hidden={!overflow.next}
          tabIndex={overflow.next ? 0 : -1}
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
