import { useRef, useState, type CSSProperties, type ReactNode } from "react";

const DEFAULT_CHAT_WIDTH = 32;
const MIN_CHAT_WIDTH = 22;
const MAX_CHAT_WIDTH = 50;

const clamp = (width: number) =>
  Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, width));

function readWidth(storageKey: string, defaultWidth: number) {
  try {
    const saved = localStorage.getItem(storageKey);
    const width = saved === null ? defaultWidth : Number(saved);
    return Number.isFinite(width) ? clamp(width) : defaultWidth;
  } catch {
    return defaultWidth;
  }
}

export function StudentWorkspace({
  editor,
  chat,
  className = "",
  storageKey = "lit:student-chat-width:v2",
  label = "AI 대화창 너비 조절",
  defaultWidth = DEFAULT_CHAT_WIDTH,
}: {
  editor: ReactNode;
  chat: ReactNode;
  className?: string;
  storageKey?: string;
  label?: string;
  defaultWidth?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    x: number;
    sidebarWidth: number;
    containerWidth: number;
  } | null>(null);
  const latestWidth = useRef(0);
  const [width, setWidth] = useState(() => readWidth(storageKey, defaultWidth));
  const [resizing, setResizing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const updateWidth = (next: number, persist = true) => {
    const value = clamp(next);
    setWidth(value);
    latestWidth.current = value;
    if (!persist) return;
    try {
      localStorage.setItem(storageKey, String(value));
    } catch {
      /* Keep resizing available when storage is unavailable. */
    }
  };

  return (
    <div
      ref={containerRef}
      className={`student-solving-body ${className} ${collapsed ? "is-sidebar-collapsed" : ""} ${resizing ? "is-resizing" : ""}`}
      style={{ "--student-chat-width": `${width}%` } as CSSProperties}
    >
      {editor}
      <div className="student-sidebar-divider">
        <div
          className="student-resize-handle"
          role="separator"
          tabIndex={collapsed ? -1 : 0}
          aria-label={label}
          aria-orientation="vertical"
          aria-valuemin={MIN_CHAT_WIDTH}
          aria-valuemax={MAX_CHAT_WIDTH}
          aria-valuenow={Math.round(width)}
          aria-valuetext={`대화창 너비 ${Math.round(width)}%`}
          title="드래그로 대화창 너비 조절 · 두 번 클릭하면 초기화"
          onPointerDown={(event) => {
            if (event.button !== 0 || collapsed) return;
            event.preventDefault();
            event.currentTarget.focus();
            const container = containerRef.current;
            if (!container) return;
            const sidebar =
              container.querySelector<HTMLElement>(".workspace-sidebar");
            if (!sidebar) return;
            dragRef.current = {
              x: event.clientX,
              sidebarWidth: sidebar.getBoundingClientRect().width,
              containerWidth: container.getBoundingClientRect().width,
            };
            latestWidth.current = width;
            event.currentTarget.setPointerCapture(event.pointerId);
            setResizing(true);
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const drag = dragRef.current;
            if (!drag) return;
            updateWidth(
              ((drag.sidebarWidth + drag.x - event.clientX) /
                drag.containerWidth) *
                100,
              false,
            );
          }}
          onPointerUp={(event) => {
            if (dragRef.current) updateWidth(latestWidth.current);
            dragRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
            setResizing(false);
          }}
          onPointerCancel={() => {
            dragRef.current = null;
            setResizing(false);
          }}
          onLostPointerCapture={() => {
            dragRef.current = null;
            setResizing(false);
          }}
          onDoubleClick={() => updateWidth(defaultWidth)}
          onKeyDown={(event) => {
            const values: Record<string, number> = {
              ArrowLeft: width + 2,
              ArrowRight: width - 2,
              Home: MIN_CHAT_WIDTH,
              End: MAX_CHAT_WIDTH,
            };
            if (event.key in values) {
              event.preventDefault();
              updateWidth(values[event.key]);
            }
          }}
        />
        <button
          type="button"
          className="sidebar-collapse-toggle"
          aria-label={
            collapsed ? "오른쪽 사이드바 펼치기" : "오른쪽 사이드바 접기"
          }
          aria-expanded={!collapsed}
          title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          onClick={() => setCollapsed((value) => !value)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={collapsed ? "M10 4 6 8l4 4" : "m6 4 4 4-4 4"} />
          </svg>
        </button>
      </div>
      <div
        className="workspace-sidebar"
        aria-hidden={collapsed}
        inert={collapsed}
      >
        {chat}
      </div>
    </div>
  );
}
