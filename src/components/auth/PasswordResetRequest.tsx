import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { requestPasswordReset } from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import "./password-reset-request.css";

/** 로그인 화면의 "비밀번호 찾기". 가입한 이메일로 재설정 링크를 보냅니다. */
export function PasswordResetRequest() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false);
    setEmail("");
    setError("");
    setSent(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    // 포털이어도 React 이벤트는 부모(로그인 폼)로 올라가므로 여기서 막습니다.
    event.stopPropagation();
    const value = email.trim();
    if (!value) {
      setError("이메일을 입력해주세요.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("올바른 이메일 주소를 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(value);
      setSent(true);
    } catch (caught) {
      setError(apiErrorMessage(caught, "재설정 메일을 보내지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="auth-forgot-link" onClick={() => setOpen(true)}>
        비밀번호를 잊으셨나요?
      </button>
      {open &&
        createPortal(
          <div onKeyDown={(event) => event.stopPropagation()}>
          <Modal
            title="비밀번호 찾기"
            onClose={close}
            actions={
              sent ? (
                <Button onClick={close}>확인</Button>
              ) : (
                <>
                  <Button type="submit" form="password-reset-request-form" loading={busy}>
                    재설정 메일 보내기
                  </Button>
                  <Button variant="secondary" onClick={close}>
                    취소
                  </Button>
                </>
              )
            }
          >
            {sent ? (
              <p className="password-reset-request-desc">
                가입된 이메일이라면 <strong>{email.trim()}</strong>(으)로 비밀번호 재설정 링크를
                보냈어요. 링크는 15분 동안 한 번만 쓸 수 있어요. 메일이 안 보이면 스팸함도 확인해주세요.
              </p>
            ) : (
              <form id="password-reset-request-form" noValidate onSubmit={(event) => void submit(event)}>
                <p className="password-reset-request-desc">
                  가입할 때 쓴 이메일을 입력하면 비밀번호를 다시 정할 수 있는 링크를 보내드려요.
                </p>
                <TextInput
                  label="이메일"
                  type="email"
                  autoComplete="email"
                  placeholder="이메일"
                  value={email}
                  disabled={busy}
                  error={error}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                />
              </form>
            )}
          </Modal>
          </div>,
          document.body,
        )}
    </>
  );
}
