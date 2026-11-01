import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { paths } from "../../router/paths";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { SAMPLE_NOTIFICATIONS, readFlag, saveFlag } from "./headerSettings";

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
  action,
  footer,
  children,
}: {
  label: string;
  icon: "bell" | "settings";
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

function NotificationsPopover() {
  const [unread, setUnread] = useState<string[]>(
    SAMPLE_NOTIFICATIONS.slice(0, 2).map((item) => item.id),
  );
  return (
    <HeaderPopover
      label="알림"
      icon="bell"
      title="알림"
      action={
        <button
          type="button"
          className="header-popover-link"
          disabled={unread.length === 0}
          onClick={() => setUnread([])}
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
      <ul className="notification-list">
        {SAMPLE_NOTIFICATIONS.map((item) => (
          <li key={item.id} className="notification-item">
            <span
              className={`notification-dot${unread.includes(item.id) ? " is-unread" : ""}`}
              aria-hidden="true"
            />
            <div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <time>{item.time}</time>
            </div>
          </li>
        ))}
      </ul>
    </HeaderPopover>
  );
}

function SettingsPopover() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notify, setNotify] = useState(() => readFlag("lit:setting:notify", true));
  const [sound, setSound] = useState(() => readFlag("lit:setting:sound", false));
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
        onChange={(value) => {
          setNotify(value);
          saveFlag("lit:setting:notify", value);
        }}
      />
      <SwitchRow
        id="setting-sound"
        label="알림 소리"
        description="새 알림이 오면 소리로 알려줍니다."
        checked={sound}
        onChange={(value) => {
          setSound(value);
          saveFlag("lit:setting:sound", value);
        }}
      />
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
