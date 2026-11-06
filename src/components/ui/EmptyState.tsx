import type { ReactNode } from "react";
import "./empty-state.css";

export type EmptyStateIcon =
  | "folder"
  | "share"
  | "sharedFolder"
  | "bell"
  | "search"
  | "users"
  | "doc"
  | "class"
  | "chat"
  | "lock"
  | "alert";

const PATHS: Record<EmptyStateIcon, ReactNode> = {
  folder: (
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6c.5 0 .97.2 1.3.55L11.6 7H18.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z" />
  ),
  share: (
    <>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M3 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M19 8v6M16 11h6" />
    </>
  ),
  sharedFolder: (
    <>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6c.5 0 .97.2 1.3.55L11.6 7H18.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z" />
      <circle cx="12" cy="12" r="1.8" />
      <path d="M8.8 17c.5-1.6 1.7-2.5 3.2-2.5s2.7.9 3.2 2.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="9.5" r="2.5" />
      <path d="M17 14c2.6 0 4.5 1.9 4.5 4.5" />
    </>
  ),
  doc: (
    <>
      <path d="M7 3h7l5 5v11.5A1.5 1.5 0 0 1 17.5 21h-10A1.5 1.5 0 0 1 6 19.5v-15A1.5 1.5 0 0 1 7.5 3Z" />
      <path d="M14 3v5h5M9.5 13h6M9.5 16.5h4" />
    </>
  ),
  class: (
    <>
      <rect x="3.5" y="4" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="4" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="14" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  chat: (
    <path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5Z" />
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </>
  ),
};

/**
 * 내용이 없을 때 보여 주는 안내. 모든 화면에서 같은 모양을 씁니다.
 * size: page(화면 전체), panel(카드·영역 안), inline(작은 목록·패널 안)
 */
export function EmptyState({
  icon = "doc",
  title,
  description,
  action,
  size = "page",
  className = "",
}: {
  icon?: EmptyStateIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  size?: "page" | "panel" | "inline";
  className?: string;
}) {
  return (
    <div className={`empty-state empty-state--${size} ${className}`} role="status">
      <span className={`empty-state-icon${icon === "alert" ? " empty-state-icon--alert" : ""}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {PATHS[icon]}
        </svg>
      </span>
      <strong className="empty-state-title">{title}</strong>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
