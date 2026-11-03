import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { paths } from "../../router/paths";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import {
  formatNotificationTime,
  playAlertSound,
  useNotifications,
} from "../../hooks/useNotifications";
import { useUserSettings } from "../../hooks/useUserSettings";
import type { AppNotification } from "../../api/notifications";

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
  title,
  badge = false,
  action,
  footer,
  children,
}: {
  label: string;
  icon: "bell" | "settings";
  title: string;
  /** 아이콘 위에 안 읽은 알림 표시(점)를 보여 줍니다. */
  badge?: boolean;
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
        {badge && <span className="header-icon-badge" aria-hidden="true" />}
      </IconButton>
      {open && (
        <section className="header-popover" role="dialog" aria-label={title}>
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

/** 알림 한 줄. 평가에 연결된 알림은 누르면 해당 채점 화면으로 이동합니다. */
export function NotificationItem({
  item,
  onOpen,
}: {
  item: AppNotification;
  onOpen: (item: AppNotification) => void;
}) {
  return (
    <li className="notification-item">
      <span
        className={`notification-dot${item.read ? "" : " is-unread"}`}
        aria-hidden="true"
      />
      <button type="button" className="notification-open" onClick={() => onOpen(item)}>
        <strong>{item.title}</strong>
        <p>{item.body}</p>
        <time dateTime={item.createdAt}>{formatNotificationTime(item.createdAt)}</time>
      </button>
    </li>
  );
}

function NotificationsPopover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const settings = useUserSettings();
  const enabled = user?.role === "TEACHER";
  const { items, unread, loading, error, markRead, markAllRead } = useNotifications(
    enabled,
    () => {
      if (settings.notify && settings.sound) playAlertSound();
    },
  );
  const open = (item: AppNotification) => {
    if (!item.read) void markRead(item.id);
    if (item.evaluationId) {
      navigate(`${paths.grading}/${encodeURIComponent(item.evaluationId)}`);
    } else if (item.assessmentId) {
      navigate(`${paths.folders}/${encodeURIComponent(item.assessmentId)}`);
    }
  };
  return (
    <HeaderPopover
      label={unread > 0 ? `알림 (안 읽은 알림 ${unread}개)` : "알림"}
      icon="bell"
      title="알림"
      badge={enabled && unread > 0}
      action={
        <button
          type="button"
          className="header-popover-link"
          disabled={unread === 0}
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
        <p className="notification-empty">선생님으로 로그인하면 평가 소식을 알림으로 받을 수 있어요.</p>
      ) : loading ? (
        <p className="notification-empty">알림을 불러오고 있어요.</p>
      ) : error ? (
        <p className="notification-empty">{error}</p>
      ) : items.length === 0 ? (
        <p className="notification-empty">새 알림이 없습니다.</p>
      ) : (
        <ul className="notification-list">
          {items.map((item) => (
            <NotificationItem key={item.id} item={item} onOpen={open} />
          ))}
        </ul>
      )}
    </HeaderPopover>
  );
}

function SettingsPopover() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notify, sound, error, setNotify, setSound } = useUserSettings();
  return (
    <HeaderPopover
      label="설정"
      icon="settings"
      title="설정"
      footer={
        <>
          <Link className="header-popover-link" to={paths.settings}>
            전체 설정 보기
          </Link>
          {user && (
            <Button
              size="small"
              variant="secondary"
              onClick={() => void logout().then(() => navigate(paths.home))}
            >
              로그아웃
            </Button>
          )}
        </>
      }
    >
      <div className="settings-account">
        <span className="settings-account-label">계정</span>
        <strong>{user ? user.name : "로그인하지 않았습니다"}</strong>
        {user && <small>{user.role === "TEACHER" ? "선생님" : "학생"}</small>}
      </div>
      <SwitchRow
        id="setting-notify"
        label="알림 받기"
        description="평가 진행 소식을 알림으로 받습니다."
        checked={notify}
        onChange={(value) => void setNotify(value)}
      />
      <SwitchRow
        id="setting-sound"
        label="알림 소리"
        description="새 알림이 오면 소리로 알려줍니다."
        checked={sound}
        onChange={(value) => void setSound(value)}
      />
      {error && <p className="notification-empty" role="alert">{error}</p>}
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
