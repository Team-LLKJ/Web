import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  confirmEmailChange,
  deleteMyAccount,
  getConsentHistory,
  sendEmailChangeVerification,
  type ConsentHistoryItem,
} from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import { paths } from "../../router/paths";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M14.5 7.5l3 3" />
    </svg>
  );
}

/** 이메일 변경: 새 이메일로 인증번호를 받고 현재 비밀번호와 함께 확인합니다. */
export function EmailChangeRow({ email }: { email: string }) {
  const { reloadUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: "email" | "password" | "code"; message: string } | null>(null);
  const errorFor = (field: "email" | "password" | "code") => (error?.field === field ? error.message : undefined);

  function reset() {
    setNext("");
    setPassword("");
    setCode("");
    setSent(false);
    setError(null);
  }
  function close() {
    if (busy) return;
    setOpen(false);
    reset();
  }

  async function sendCode() {
    if (!EMAIL_PATTERN.test(next.trim())) {
      setError({ field: "email", message: "올바른 이메일을 입력해주세요." });
      return;
    }
    if (!password) {
      setError({ field: "password", message: "현재 비밀번호를 입력해주세요." });
      return;
    }
    setBusy(true);
    try {
      await sendEmailChangeVerification(next.trim().toLowerCase(), password);
      setSent(true);
      setError(null);
    } catch (caught) {
      const code = (caught as { code?: string })?.code;
      setError({
        field: code === "INVALID_CURRENT_PASSWORD" ? "password" : "email",
        message: apiErrorMessage(caught, "인증번호를 보내지 못했습니다."),
      });
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!sent) return void sendCode();
    if (!code.trim()) {
      setError({ field: "code", message: "인증번호를 입력해주세요." });
      return;
    }
    setBusy(true);
    try {
      await confirmEmailChange(next.trim().toLowerCase(), password, code.trim());
      await reloadUser();
      setOpen(false);
      reset();
    } catch (caught) {
      setError({ field: "code", message: apiErrorMessage(caught, "이메일을 바꾸지 못했습니다.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <dt>이메일</dt>
      <dd className="settings-name-value">
        {email}
        <button type="button" className="settings-icon-button" aria-label="이메일 수정" title="이메일 수정" onClick={() => setOpen(true)}>
          <PencilIcon />
        </button>
      </dd>
      {open && (
        <Modal
          title="이메일 변경"
          onClose={close}
          dismissOnBackdrop={false}
          actions={
            <>
              <Button type="submit" form="email-change-form" loading={busy}>
                {sent ? "변경" : "인증번호 받기"}
              </Button>
              <Button variant="secondary" onClick={close}>
                취소
              </Button>
            </>
          }
        >
          <form id="email-change-form" className="settings-password-form" onSubmit={(event) => void submit(event)} noValidate>
            <TextInput
              label="새 이메일"
              type="email"
              autoComplete="email"
              value={next}
              disabled={busy || sent}
              error={errorFor("email")}
              onChange={(event) => {
                setNext(event.target.value);
                setError(null);
              }}
            />
            <TextInput
              label="현재 비밀번호"
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={busy || sent}
              error={errorFor("password")}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
            />
            {sent && (
              <TextInput
                label="인증번호"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                disabled={busy}
                error={errorFor("code")}
                onChange={(event) => {
                  setCode(event.target.value);
                  setError(null);
                }}
              />
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}

/** 동의 이력(약관 버전·동의 일시). */
export function ConsentHistory() {
  const [items, setItems] = useState<ConsentHistoryItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || items) return;
    getConsentHistory()
      .then((result) => setItems(result.items))
      .catch(() => setFailed(true));
  }, [open, items]);

  const label = (type: string) =>
    type === "TERMS_OF_SERVICE" || type === "TERMS"
      ? "이용약관"
      : type === "PRIVACY_POLICY" || type === "PRIVACY"
        ? "개인정보 처리방침"
        : type;

  return (
    <>
      <button type="button" className="settings-link-row settings-link-button" onClick={() => setOpen(true)}>
        <span>동의 이력</span>
        <svg className="info-chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
      {open && (
        <Modal
          title="동의 이력"
          onClose={() => setOpen(false)}
          actions={<Button onClick={() => setOpen(false)}>확인</Button>}
        >
          {failed ? (
            <p className="info-error" role="alert">동의 이력을 불러오지 못했습니다.</p>
          ) : !items ? (
            <p>불러오는 중…</p>
          ) : items.length === 0 ? (
            <p>동의 이력이 없습니다.</p>
          ) : (
            <ul className="consent-history-list">
              {items.map((item, index) => (
                <li key={`${item.policyType}-${item.version}-${index}`}>
                  <strong>{label(item.policyType)}</strong>
                  <span>
                    {item.version} · {new Date(item.acceptedAt).toLocaleString("ko-KR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </>
  );
}

/** 회원 탈퇴: 비밀번호 확인 후 계정과 본인 소유 데이터를 영구 삭제합니다. */
export function DeleteAccount() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (busy) return;
    setOpen(false);
    setPassword("");
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setError("현재 비밀번호를 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      await deleteMyAccount(password);
      await logout().catch(() => undefined);
      navigate(paths.login, { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught, "탈퇴하지 못했습니다."));
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="settings-link-row settings-link-button settings-link-button--danger" onClick={() => setOpen(true)}>
        <span>회원 탈퇴</span>
        <svg className="info-chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
      {open && (
        <Modal
          title="회원 탈퇴"
          onClose={close}
          dismissOnBackdrop={false}
          actions={
            <>
              <Button type="submit" variant="white-danger" form="delete-account-form" loading={busy}>
                탈퇴하기
              </Button>
              <Button variant="secondary" onClick={close}>
                취소
              </Button>
            </>
          }
        >
          <form id="delete-account-form" className="settings-password-form" onSubmit={(event) => void submit(event)} noValidate>
            <p>탈퇴하면 계정과 내가 만든 수행평가, 학생 기록이 영구 삭제됩니다. 진행 중인 평가가 있으면 탈퇴할 수 없어요.</p>
            <TextInput
              label="현재 비밀번호"
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={busy}
              error={error || undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
            />
          </form>
        </Modal>
      )}
    </>
  );
}
