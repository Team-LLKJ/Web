import { useState, type FormEvent } from "react";
import { changeMyPassword } from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { PASSWORD_MAX, checkNewPassword } from "../../lib/passwordRules";

/** 설정 화면의 비밀번호 변경(선생님 전용). 이름 수정은 계정 정보 카드에서 합니다. */
export function AccountSettings() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  // 오류가 난 입력칸 아래에 보여줍니다.
  const [passwordError, setPasswordErrorState] = useState<{ field: "current" | "next" | "confirm"; message: string } | null>(null);
  const setPasswordError = (message: string, field: "current" | "next" | "confirm" = "confirm") =>
    setPasswordErrorState(message ? { field, message } : null);
  const errorFor = (field: "current" | "next" | "confirm") =>
    passwordError?.field === field ? passwordError.message : undefined;
  const [passwordDone, setPasswordDone] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    setPasswordDone("");
    if (!current) {
      setPasswordError("현재 비밀번호를 입력해주세요.", "current");
      return;
    }
    const problem = checkNewPassword(next);
    if (problem) {
      setPasswordError(problem, "next");
      return;
    }
    if (next === current) {
      setPasswordError("현재 비밀번호와 다른 비밀번호를 입력해주세요.", "next");
      return;
    }
    if (next !== confirm) {
      setPasswordError("새 비밀번호가 서로 달라요.", "confirm");
      return;
    }
    setPasswordBusy(true);
    try {
      const result = await changeMyPassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setPasswordError("");
      setPasswordDone(result?.message ?? "비밀번호를 바꿨어요.");
      setOpen(false);
    } catch (caught) {
      const code = (caught as { code?: string })?.code;
      setPasswordError(
        apiErrorMessage(caught, "비밀번호를 바꾸지 못했습니다."),
        code === "INVALID_CURRENT_PASSWORD" ? "current" : code === "PASSWORD_UNCHANGED" ? "next" : "confirm",
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  function closeDialog() {
    if (passwordBusy) return;
    setOpen(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    setPasswordError("");
  }

  return (
    <section className="settings-group" aria-label="비밀번호 변경">
      <h2>비밀번호 변경</h2>
      <div className="settings-group-card settings-password-row">
        <div>
          <strong>비밀번호</strong>
          <small>
            {passwordDone || "바꾸면 다른 기기에서는 로그아웃돼요."}
          </small>
        </div>
        <button
          type="button"
          className="settings-icon-button"
          aria-label="비밀번호 변경"
          title="비밀번호 변경"
          onClick={() => {
            setPasswordDone("");
            setOpen(true);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
            <path d="M14.5 7.5l3 3" />
          </svg>
        </button>
      </div>
      {open && (
        <Modal
          title="비밀번호 변경"
          onClose={closeDialog}
          dismissOnBackdrop={false}
          actions={
            <>
              <Button type="submit" form="password-change-form" loading={passwordBusy}>
                변경
              </Button>
              <Button variant="secondary" onClick={closeDialog}>
                취소
              </Button>
            </>
          }
        >
          <form
            id="password-change-form"
            className="settings-password-form"
            onSubmit={submitPassword}
            noValidate
          >
            <TextInput
              label="현재 비밀번호"
              type="password"
              autoComplete="current-password"
              value={current}
              maxLength={PASSWORD_MAX}
              error={errorFor("current")}
              onChange={(event) => {
                setCurrent(event.target.value);
                setPasswordError("");
              }}
            />
            <TextInput
              label="새 비밀번호 (10자 이상, 영문·숫자 포함)"
              type="password"
              autoComplete="new-password"
              value={next}
              maxLength={PASSWORD_MAX}
              error={errorFor("next")}
              onChange={(event) => {
                setNext(event.target.value);
                setPasswordError("");
              }}
            />
            <TextInput
              label="새 비밀번호 확인"
              type="password"
              autoComplete="new-password"
              value={confirm}
              maxLength={PASSWORD_MAX}
              error={errorFor("confirm")}
              onChange={(event) => {
                setConfirm(event.target.value);
                setPasswordError("");
              }}
            />
          </form>
        </Modal>
      )}
    </section>
  );
}
