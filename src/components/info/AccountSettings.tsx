import { useState, type FormEvent } from "react";
import { changeMyPassword } from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";

/** 설정 화면의 비밀번호 변경(선생님 전용). 이름 수정은 계정 정보 카드에서 합니다. */
export function AccountSettings() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordDone, setPasswordDone] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    setPasswordDone("");
    if (!current) {
      setPasswordError("현재 비밀번호를 입력해주세요.");
      return;
    }
    if (next.length < 10 || next.length > 128) {
      setPasswordError("새 비밀번호는 10자 이상 128자 이하로 입력해주세요.");
      return;
    }
    if (next !== confirm) {
      setPasswordError("새 비밀번호가 서로 달라요.");
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
    } catch (caught) {
      setPasswordError(
        apiErrorMessage(caught, "비밀번호를 바꾸지 못했습니다."),
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <section className="settings-group" aria-label="비밀번호 변경">
      <h2>비밀번호 변경</h2>
      <form
        className="settings-group-card settings-password-form"
        onSubmit={submitPassword}
        noValidate
      >
        <TextInput
          label="현재 비밀번호"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => {
            setCurrent(event.target.value);
            setPasswordError("");
          }}
        />
        <TextInput
          label="새 비밀번호 (10자 이상)"
          type="password"
          autoComplete="new-password"
          value={next}
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
          error={passwordError}
          onChange={(event) => {
            setConfirm(event.target.value);
            setPasswordError("");
          }}
        />
        {passwordDone && (
          <p className="settings-password-done">{passwordDone}</p>
        )}
        <div className="settings-name-actions">
          <Button size="small" type="submit" loading={passwordBusy}>
            비밀번호 변경
          </Button>
        </div>
      </form>
    </section>
  );
}
