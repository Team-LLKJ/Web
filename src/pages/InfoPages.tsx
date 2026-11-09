import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { updateMyName } from "../api/auth";
import { apiErrorMessage } from "../api/client";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "../auth/useAuth";
import { LegalDocument } from "../components/info/LegalDocument";
import {
  PRIVACY_DOCUMENT,
  TERMS_DOCUMENT,
} from "../components/info/legalContent";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LandingHeader } from "../components/landing/LandingHeader";
import { Avatar } from "../components/ui/Avatar";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { LogoutButton } from "../components/ui/LogoutButton";
import {
  NotificationRowContent,
  SwitchRow, NotificationListSkeleton } from "../components/ui/HeaderDialogs";
import { TextInput } from "../components/ui/TextInput";
import { Skeleton, SkeletonStatus } from "../components/ui/Skeleton";
import { Tabs } from "../components/ui/Tabs";
import { toNotificationRow } from "../components/ui/headerSettings";
import { AccountSettings } from "../components/info/AccountSettings";
import { ConsentHistory, DeleteAccount, EmailChangeRow } from "../components/info/AccountExtras";
import { useNotifications } from "../hooks/useNotifications";
import { Toast } from "../components/teacher/Toast";
import { useUserSettings } from "../hooks/useUserSettings";
import "../components/info/account-settings.css";
import { paths } from "../router/paths";
import "../components/landing/landing.css";
import "../components/info/info.css";
import "../components/teacher/folder-share.css";
import "../components/info/notification-delete.css";

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

/** 계정 정보의 이름 줄. 연필 아이콘을 누르면 이름 수정 창이 열립니다. */
function NameRow({ name }: { name: string }) {
  const { reloadUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function close() {
    if (saving) return;
    setEditing(false);
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = value.trim();
    if (!next || next.length > 50) {
      setError("이름을 50자 이내로 입력해주세요.");
      return;
    }
    if (next === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateMyName(next);
      await reloadUser();
      setEditing(false);
      setError("");
    } catch (caught) {
      setError(apiErrorMessage(caught, "이름을 바꾸지 못했습니다."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <dt>이름</dt>
      <dd className="settings-name-value">
        <span className="settings-name-text" title={name}>{name}</span>
        <button
          type="button"
          className="settings-icon-button"
          aria-label="이름 수정"
          title="이름 수정"
          onClick={() => {
            setValue(name);
            setError("");
            setEditing(true);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
            <path d="M14.5 7.5l3 3" />
          </svg>
        </button>
      </dd>
      {editing && (
        <Modal
          title="이름 수정"
          onClose={close}
          dismissOnBackdrop={false}
          actions={
            <>
              <Button type="submit" form="settings-name-form" loading={saving}>
                저장
              </Button>
              <Button variant="secondary" onClick={close}>
                취소
              </Button>
            </>
          }
        >
          <form id="settings-name-form" onSubmit={(event) => void submit(event)} noValidate>
            <TextInput
              id="settings-name"
              label="이름"
              value={value}
              maxLength={50}
              autoComplete="name"
              autoFocus
              disabled={saving}
              error={error || undefined}
              onChange={(event) => {
                setValue(event.target.value);
                setError("");
              }}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

export function SettingsPage() {
  const { user, loading } = useAuth();
  const { notify, error: settingsError, setNotify } = useUserSettings();

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
              <NameRow key={user.name} name={user.name} />
              {user.email && <EmailChangeRow key={user.email} email={user.email} />}
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
          {settingsError && (
            <p className="info-error" role="alert">
              {settingsError}
            </p>
          )}
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
          {user && <ConsentHistory />}
        </SettingsGroup>

        {user && (
          <SettingsGroup title="계정">
            <LogoutButton asRow />
            <DeleteAccount />
          </SettingsGroup>
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
  const { items, unread, loading, error, markRead, markAllRead, remove, removeAll } =
    useNotifications(enabled);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [notice, setNotice] = useState("");

  async function removeOne(id: string) {
    if (params.get("id") === id) setParams({});
    try {
      await remove(Number(id));
    } catch (caught) {
      setNotice(apiErrorMessage(caught, "알림을 삭제하지 못했습니다."));
    }
  }

  async function clearAll() {
    setClearing(true);
    try {
      await removeAll();
      setParams({});
      setClearOpen(false);
    } catch (caught) {
      setNotice(apiErrorMessage(caught, "알림을 삭제하지 못했습니다."));
    } finally {
      setClearing(false);
    }
  }
  const rows = items.map(toNotificationRow);
  const unreadCount = enabled ? unread : 0;
  const isRead = (id: string) =>
    rows.find((item) => item.id === id)?.read ?? true;
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
          {unreadCount > 0 && (
            <p className="info-description">
              {`읽지 않은 알림이 ${unreadCount}개 있습니다.`}
            </p>
          )}
        </div>
      </header>
      <div className="tab-toolbar">
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
        <div className="notifications-actions">
          <button
            type="button"
            className="folder-action"
            disabled={unreadCount === 0}
            onClick={() => void markAllRead()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
            모두 읽음
          </button>
          <button
            type="button"
            className="folder-action folder-action--danger"
            disabled={!enabled || rows.length === 0}
            onClick={() => setClearOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M10 11v6M14 11v6" />
              <path d="M6 7l1 13h10l1-13" />
              <path d="M9 7V4h6v3" />
            </svg>
            전체 삭제
          </button>
        </div>
      </div>
      <section className="notifications-card" aria-label="알림 목록">
        {!enabled ? (
          <EmptyState size="panel" icon="bell" title="선생님으로 로그인하면 알림을 받을 수 있어요" description="평가 진행 소식이 이곳에 표시돼요." />
        ) : loading ? (
          <NotificationListSkeleton count={5} />
        ) : error ? (
          <EmptyState size="panel" icon="alert" title="알림을 불러오지 못했어요" description={error} />
        ) : visible.length === 0 ? (
          <EmptyState
            size="panel"
            icon="bell"
            title={filter === "unread" ? "읽지 않은 알림이 없어요" : "아직 알림이 없어요"}
            description="새 소식이 오면 이곳에 표시돼요."
          />
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
                      <div className="notification-detail-footer">
                      {item.action ? (
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
                      ) : (
                        <span />
                      )}
                        <button
                          type="button"
                          className="notification-delete"
                          onClick={() => void removeOne(item.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <Toast message={notice} onClose={() => setNotice("")} />
      {clearOpen && (
        <Modal
          title="알림을 모두 삭제할까요?"
          onClose={() => setClearOpen(false)}
          actions={
            <>
              <Button variant="white-danger" loading={clearing} onClick={() => void clearAll()}>
                삭제
              </Button>
              <Button variant="secondary" onClick={() => setClearOpen(false)}>
                취소
              </Button>
            </>
          }
        >
          <p>읽은 알림까지 모두 지워지고, 지운 알림은 되돌릴 수 없어요.</p>
        </Modal>
      )}
    </InfoLayout>
  );
}
