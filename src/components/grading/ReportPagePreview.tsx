import { useEffect, useRef, useState, type ReactNode } from "react";
import "./report-page-preview.css";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const clampZoom = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));

// A4를 96dpi로 환산한 크기. 인쇄 여백(18mm 16mm)과 같게 맞춥니다.
const PAGE_W = 794;
const PAGE_H = 1123;
const PAD_X = 60;
const PAD_Y = 68;
const BODY_H = PAGE_H - PAD_Y * 2;

/** 보고서를 A4 용지처럼 한 쪽씩 보여주고 < > 버튼으로 넘깁니다. 스크롤 없이 한 쪽 전체가 보입니다. */
export function ReportPagePreview({ children, title }: { children: ReactNode; title: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => setScale(Math.min(box.offsetWidth / PAGE_W, box.offsetHeight / PAGE_H));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const count = () => setPages(Math.max(1, Math.ceil(content.scrollHeight / BODY_H)));
    count();
    const observer = new ResizeObserver(count);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  // Ctrl(⌘)+휠로 확대·축소합니다.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((value) => clampZoom(value + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, []);
  const current = Math.min(page, pages);
  const shown = scale * zoom;
  return (
    <div className="report-preview-view">
      <div className={`report-preview-stage ${zoom > 1 ? "is-zoomed" : ""}`} ref={boxRef}>
        <div
          className="report-sheet-frame"
          style={{ width: PAGE_W * shown, height: PAGE_H * shown, visibility: scale ? "visible" : "hidden" }}
        >
          <div
            className="report-sheet"
            role="img"
            aria-label={`${title} ${current}쪽`}
            style={{ width: PAGE_W, height: PAGE_H, padding: `${PAD_Y}px ${PAD_X}px`, transform: `scale(${shown})` }}
          >
            <div className="report-sheet-body" style={{ height: BODY_H }}>
              <div ref={contentRef} style={{ transform: `translateY(${-(current - 1) * BODY_H}px)` }}>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="report-preview-zoom" role="group" aria-label="확대 축소">
        <button type="button" aria-label="축소" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((v) => clampZoom(v - ZOOM_STEP))}>−</button>
        <button type="button" className="report-preview-zoom-value" aria-label="원래 크기로" onClick={() => setZoom(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" aria-label="확대" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((v) => clampZoom(v + ZOOM_STEP))}>+</button>
      </div>
      <div className="report-preview-nav">
        <button type="button" aria-label="이전 쪽" disabled={current <= 1} onClick={() => setPage(current - 1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span>
          {current} / {pages}
        </span>
        <button type="button" aria-label="다음 쪽" disabled={current >= pages} onClick={() => setPage(current + 1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
