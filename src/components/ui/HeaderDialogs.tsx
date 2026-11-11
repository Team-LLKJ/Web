import { EmptyState } from "./EmptyState";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { paths } from "../../router/paths";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { Skeleton, SkeletonStatus } from "./Skeleton";
import { IconButton } from "./IconButton";
import { LogoutButton } from "./LogoutButton";
import {
  toNotificationRow,
  type AppNotification,
  type NotificationKind,
} from "./headerSettings";
import { playAlertSound, useNotifications } from "../../hooks/useNotifications";
import { useUserSettings } from "../../hooks/useUserSettings";

/** 알림 한 줄의 내용. 헤더 팝업과 알림 화면이 같은 모양을 씁니다. */
/** 알림 목록을 불러오는 동안 보이는 자리 표시. 실제 알림 줄과 같은 모양입니다. */
export function NotificationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonStatus label="알림을 불러오는 중" className="notification-skeleton">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="notification-item notification-skeleton-row">
          <Skeleton className="notification-skeleton-icon" />
          <span className="notification-item-text">
            <Skeleton style={{ width: "45%", height: 18 }} />
            <Skeleton style={{ width: "80%", height: 16 }} />
          </span>
        </div>
      ))}
    </SkeletonStatus>
  );
}

export function NotificationRowContent({
  item,
  unread,
  trailing,
}: {
  item: AppNotification;
  unread: boolean;
  trailing?: ReactNode;
}) {
  return (
    <>
      <span className="notification-item-icon">
        <NotificationKindIcon kind={item.kind} />
        {unread && (
          <span className="notification-dot">
            <span className="sr-only">읽지 않음</span>
          </span>
        )}
      </span>
      <span className="notification-item-text">
        <span className="notification-item-top">
          <strong>{item.title}</strong>
          <span className="notification-item-side">
            <time>{item.time}</time>
            {trailing}
          </span>
        </span>
        <span className="notification-item-body">{item.body}</span>
      </span>
    </>
  );
}

/** 알림 종류별 작은 아이콘. 헤더 팝업과 알림 화면에서 같이 씁니다. */
export function NotificationKindIcon({ kind }: { kind: NotificationKind }) {
  return (
    <span
      className={`notification-kind notification-kind--${kind}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="18" height="18">
        {kind === "submission" ? (
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        ) : kind === "evaluation" ? (
          <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4.5l3 2" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 11v5M12 8h.01" />
          </>
        )}
      </svg>
    </span>
  );
}

export function SwitchRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="settings-row" htmlFor={id}>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

/** 헤더 아이콘 아래에 펼쳐지는 패널(모달이 아닌 팝업). 바깥을 누르거나 Esc로 닫습니다. */
function HeaderPopover({
  label,
  icon,
  badge = 0,
  title,
  action,
  footer,
  children,
}: {
  label: string;
  icon: "bell" | "settings";
  badge?: number;
  title: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="header-popover-anchor" ref={ref}>
      <IconButton
        label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={icon} />
        {badge > 0 && (
          <span className="header-popover-badge" aria-hidden="true">
            {badge}
          </span>
        )}
      </IconButton>
      {open && (
        <section
          className="header-popover"
          role="dialog"
          aria-label={title}
          onClick={(event) => {
            if ((event.target as Element).closest("a")) setOpen(false);
          }}
        >
          <div className="header-popover-head">
            <h2>{title}</h2>
            {action}
          </div>
          <div className="header-popover-body">{children}</div>
          {footer && <div className="header-popover-foot">{footer}</div>}
        </section>
      )}
    </div>
  );
}

function NotificationsPopover() {
  const { user } = useAuth();
  const settings = useUserSettings();
  const enabled = user?.role === "TEACHER";
  const { items, unread, loading, error, markRead, markAllRead } =
    useNotifications(enabled, () => {
      if (settings.notify && settings.sound) playAlertSound();
    });
  const rows = items.map(toNotificationRow);
  const unreadCount = enabled ? unread : 0;
  return (
    <HeaderPopover
      label={unreadCount > 0 ? `알림, 읽지 않은 알림 ${unreadCount}개` : "알림"}
      icon="bell"
      badge={unreadCount}
      title="알림"
      action={
        <button
          type="button"
          className="header-popover-link"
          disabled={unreadCount === 0}
          onClick={() => void markAllRead()}
        >
          모두 읽음
        </button>
      }
      footer={
        <Link className="header-popover-link" to={paths.notifications}>
          전체 알림 보기
        </Link>
      }
    >
      {!enabled ? (
        <EmptyState size="inline" icon="bell" title="선생님으로 로그인하면 알림을 받을 수 있어요" />
      ) : loading ? (
        <NotificationListSkeleton count={3} />
      ) : error ? (
        <EmptyState size="inline" icon="alert" title="알림을 불러오지 못했어요" description={error} />
      ) : rows.length === 0 ? (
        <EmptyState size="inline" icon="bell" title="새 알림이 없어요" />
      ) : (
        <ul className="notification-list notification-list--popover">
          {rows.map((item) => (
            <li key={item.id}>
              <Link
                className={`notification-item${item.read ? "" : " is-unread"}`}
                to={`${paths.notifications}?id=${item.id}`}
                onClick={() => {
                  if (!item.read) void markRead(Number(item.id));
                }}
              >
                <NotificationRowContent item={item} unread={!item.read} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HeaderPopover>
  );
}

function SettingsPopover() {
  const { user } = useAuth();
  const { notify, error, setNotify } = useUserSettings();
  return (
    <HeaderPopover
      label="설정"
      icon="settings"
      title="설정"
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link
            className="button button--secondary button--small neutral header-popover-cta"
            to={paths.settings}
          >
            전체 설정 보기
          </Link>
          {user && (
            <LogoutButton
              variant="white-danger"
              size="small"
              className="header-popover-cta"
            />
          )}
        </div>
      }
    >
      {user ? (
        <div className="settings-account">
          <Avatar name={user.name} size="large" />
          <div className="settings-account-text">
            <p className="settings-account-name">
              <strong>{user.name}</strong>
            </p>
            <small>
              {[user.school, user.email].filter(Boolean).join(" · ")}
            </small>
          </div>
        </div>
      ) : (
        <div className="settings-account">
          <span className="settings-account-guest" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <circle cx="12" cy="9" r="3.5" />
              <path d="M5.5 19c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
            </svg>
          </span>
          <div className="settings-account-text">
            <p className="settings-account-name">
              <strong>로그인하지 않았습니다</strong>
            </p>
            <Link className="header-popover-link" to={paths.login}>
              로그인하기
            </Link>
          </div>
        </div>
      )}
      <SwitchRow
        id="setting-notify"
        label="알림 받기"
        description="평가 진행 소식을 알림으로 받습니다."
        checked={notify}
        onChange={(value) => void setNotify(value)}
      />
      {error && (
        <p className="notification-empty" role="alert">
          {error}
        </p>
      )}
    </HeaderPopover>
  );
}

/** 헤더 오른쪽의 알림·설정 버튼. 모달 대신 아이콘 아래 팝업으로 열립니다. */
export function HeaderUtilities({ onSettings }: { onSettings?: () => void }) {
  return (
    <>
      <NotificationsPopover />
      {onSettings ? (
        <IconButton label="설정" onClick={onSettings}>
          <Icon name="settings" />
        </IconButton>
      ) : (
        <SettingsPopover />
      )}
    </>
  );
}
