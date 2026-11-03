import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { LegalDocument } from "../components/info/LegalDocument";
import {
  PRIVACY_DOCUMENT,
  TERMS_DOCUMENT,
} from "../components/info/legalContent";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LandingHeader } from "../components/landing/LandingHeader";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import {
  NotificationRowContent,
  SwitchRow,
} from "../components/ui/HeaderDialogs";
import { Skeleton, SkeletonStatus } from "../components/ui/Skeleton";
import { Tabs } from "../components/ui/Tabs";
import { toNotificationRow } from "../components/ui/headerSettings";
import { AccountSettings } from "../components/info/AccountSettings";
import { useNotifications } from "../hooks/useNotifications";
import { useUserSettings } from "../hooks/useUserSettings";
import "../components/info/account-settings.css";
import { paths } from "../router/paths";
import "../components/landing/landing.css";
import "../components/info/info.css";

function InfoLayout({
  title,
  description,
  wide = false,
  footer = true,
  children,
}: {
  title?: string;
  description?: string;
  wide?: boolean;
  footer?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="info-page">
      <LandingHeader onNotice={() => undefined} />
      <main className={`info-main${wide ? " info-main--wide" : ""}`}>
        {title && (
          <header className="info-heading">
            <h1>{title}</h1>
            {description && <p className="info-description">{description}</p>}
          </header>
        )}
        {children}
      </main>
      {footer && <LandingFooter />}
    </div>
  );
}

export function TermsPage() {
  return (
    <InfoLayout wide>
      <LegalDocument doc={TERMS_DOCUMENT} idPrefix="terms" />
    </InfoLayout>
  );
}

export function PrivacyPage() {
  return (
    <InfoLayout wide>
      <LegalDocument doc={PRIVACY_DOCUMENT} idPrefix="privacy" />
    </InfoLayout>
  );
}

function Chevron() {
  return (
    <svg
      className="info-chevron"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-group" aria-label={title}>
      <h2>{title}</h2>
      <div className="settings-group-card">{children}</div>
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <SkeletonStatus
      label="계정 정보를 불러오는 중"
      className="settings-profile"
    >
      <Skeleton className="settings-profile-avatar-skeleton" />
      <div className="settings-profile-text">
        <Skeleton style={{ width: 120, height: 24 }} />
        <Skeleton style={{ width: 180, height: 18 }} />
      </div>
    </SkeletonStatus>
  );
}

export function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { notify, sound, error: settingsError, setNotify, setSound } = useUserSettings();
  const [loggingOut, setLoggingOut] = useState(false);
  const roleLabel = user?.role === "TEACHER" ? "선생님" : "학생";

  return (
    <InfoLayout
      title="설정"
      description="계정과 알림, 서비스 정보를 관리합니다."
      footer={false}
    >
      <div className="settings-page">
        {loading ? (
          <ProfileSkeleton />
        ) : user ? (
          <section className="settings-profile" aria-label="내 계정">
            <Avatar name={user.name} size="large" />
            <div className="settings-profile-text">
              <p className="settings-profile-name">
                <strong>{user.name}</strong>
              </p>
              <p className="settings-profile-sub">
                {[user.school, user.email].filter(Boolean).join(" · ")}
              </p>
            </div>
          </section>
        ) : (
          <section
            className="settings-profile settings-profile--guest"
            aria-label="내 계정"
          >
            <div className="settings-profile-text">
              <p className="settings-profile-name">
                <strong>로그인하지 않았습니다</strong>
              </p>
              <p className="settings-profile-sub">
                로그인하면 계정 정보를 확인할 수 있습니다.
              </p>
            </div>
            <Link className="button primary" to={paths.login}>
              로그인
            </Link>
          </section>
        )}

        {user && (
          <SettingsGroup title="계정 정보">
            <dl className="settings-info-list">
              <div>
                <dt>아이디</dt>
                <dd>{user.username}</dd>
              </div>
              <div>
                <dt>구분</dt>
                <dd>{roleLabel}</dd>
              </div>
              {user.role === "STUDENT" && user.grade !== null && (
                <div>
                  <dt>학년·반·번호</dt>
                  <dd>
                    {user.grade}학년 {user.classNumber}반 {user.studentNumber}번
                  </dd>
                </div>
              )}
            </dl>
          </SettingsGroup>
        )}

        {user?.role === "TEACHER" && <AccountSettings />}

        <SettingsGroup title="알림">
          <SwitchRow
            id="page-notify"
            label="알림 받기"
            description="평가 진행 소식을 알림으로 받습니다."
            checked={notify}
            onChange={(value) => void setNotify(value)}
          />
          <SwitchRow
            id="page-sound"
            label="알림 소리"
            description="새 알림이 오면 소리로 알려줍니다."
            checked={sound}
            onChange={(value) => void setSound(value)}
          />
          {settingsError && <p className="info-error" role="alert">{settingsError}</p>}
        </SettingsGroup>

        <SettingsGroup title="서비스 정보">
          <Link className="settings-link-row" to={paths.notifications}>
            <span>알림 전체 보기</span>
            <Chevron />
          </Link>
          <Link className="settings-link-row" to={paths.terms}>
            <span>이용약관</span>
            <Chevron />
          </Link>
          <Link className="settings-link-row" to={paths.privacy}>
            <span>개인정보 처리방침</span>
            <Chevron />
          </Link>
        </SettingsGroup>

        {user && (
          <div className="settings-logout">
            <Button
              variant="secondary"
              loading={loggingOut}
              onClick={() => {
                setLoggingOut(true);
                void logout()
                  .then(() => navigate(paths.home))
                  .finally(() => setLoggingOut(false));
              }}
            >
              로그아웃
            </Button>
          </div>
        )}
      </div>
    </InfoLayout>
  );
}

export function NotificationsPage() {
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { user } = useAuth();
  const enabled = user?.role === "TEACHER";
  const { items, unread, loading, error, markRead, markAllRead } = useNotifications(enabled);
  const rows = items.map(toNotificationRow);
  const unreadCount = enabled ? unread : 0;
  const isRead = (id: string) => rows.find((item) => item.id === id)?.read ?? true;
  const selectedId = params.get("id");
  const selected = rows.find((item) => item.id === selectedId);
  const visible = rows.filter(
    (item) => filter === "all" || !item.read || item.id === selectedId,
  );

  // 주소로 바로 들어온 알림도 읽음으로 표시합니다.
  const selectedUnread = selected && !selected.read ? selected.id : null;
  useEffect(() => {
    if (selectedUnread) void markRead(Number(selectedUnread));
  }, [selectedUnread, markRead]);

  return (
    <InfoLayout footer={false}>
      <header className="notifications-head">
        <div>
          <h1>알림</h1>
          <p className="info-description">
            {unreadCount > 0
              ? `읽지 않은 알림이 ${unreadCount}개 있습니다.`
              : "새 알림을 모두 확인했습니다."}
          </p>
        </div>
        <button
          type="button"
          className="notifications-read-all"
          disabled={unreadCount === 0}
          onClick={() => void markAllRead()}
        >
          모두 읽음
        </button>
      </header>
      <Tabs
        label="알림 거르기"
        variant="segment"
        value={filter}
        items={[
          { value: "all", label: "전체" },
          {
            value: "unread",
            label: unreadCount > 0 ? `안 읽음 ${unreadCount}` : "안 읽음",
          },
        ]}
        onChange={setFilter}
      />
      <section className="notifications-card" aria-label="알림 목록">
        {!enabled ? (
          <div className="notifications-empty">
            <strong>선생님으로 로그인하면 알림을 받을 수 있어요</strong>
            <p>평가 진행 소식이 이곳에 표시됩니다.</p>
          </div>
        ) : loading ? (
          <div className="notifications-empty">
            <p>알림을 불러오고 있어요.</p>
          </div>
        ) : error ? (
          <div className="notifications-empty">
            <p>{error}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="notifications-empty">
            <strong>{filter === "unread" ? "읽지 않은 알림이 없습니다" : "알림이 없습니다"}</strong>
            <p>새 소식이 오면 이곳에 표시됩니다.</p>
          </div>
        ) : (
          <ul className="notification-list">
            {visible.map((item) => {
              const expanded = item.id === selectedId;
              return (
                <li
                  key={item.id}
                  className={expanded ? "is-expanded" : undefined}
                >
                  <button
                    type="button"
                    className="notification-item"
                    aria-expanded={expanded}
                    aria-controls={`notification-${item.id}`}
                    onClick={() => setParams(expanded ? {} : { id: item.id })}
                  >
                    <NotificationRowContent
                      item={item}
                      unread={!isRead(item.id)}
                      trailing={
                        <svg
                          className="notification-toggle"
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                          aria-hidden="true"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      }
                    />
                  </button>
                  {expanded && (
                    <div
                      id={`notification-${item.id}`}
                      className="notification-detail"
                    >
                      <p>{item.detail}</p>
                      {item.action && (
                        <Link
                          className="notification-detail-action"
                          to={item.action.to}
                        >
                          {item.action.label}
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            aria-hidden="true"
                          >
                            <path d="m9 6 6 6-6 6" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </InfoLayout>
  );
}
