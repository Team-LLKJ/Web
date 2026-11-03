import { useState, type FormEvent } from "react";
import { changeMyPassword, updateMyName } from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";

/** 설정 화면의 계정 관리: 이름 수정과 비밀번호 변경(선생님 전용). */
export function AccountSettings() {
  const { user, reloadUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [nameError, setNameError] = useState("");
  const [nameDone, setNameDone] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordDone, setPasswordDone] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  async function submitName(event: FormEvent) {
    event.preventDefault();
    setNameDone("");
    const value = name.trim();
    if (!value || value.length > 50) {
      setNameError("이름을 50자 이내로 입력해주세요.");
      return;
    }
    setNameBusy(true);
    try {
      await updateMyName(value);
      await reloadUser();
      setNameError("");
      setNameDone("이름을 바꿨어요.");
    } catch (caught) {
      setNameError(apiErrorMessage(caught, "이름을 바꾸지 못했습니다."));
    } finally {
      setNameBusy(false);
    }
  }

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
      setPasswordError(apiErrorMessage(caught, "비밀번호를 바꾸지 못했습니다."));
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <section className="info-card">
      <h2>내 정보</h2>
      <form className="info-form" onSubmit={submitName}>
        <TextInput
          label="이름"
          value={name}
          maxLength={50}
          error={nameError}
          onChange={(event) => {
            setName(event.target.value);
            setNameError("");
            setNameDone("");
          }}
        />
        {nameDone && <p className="info-done">{nameDone}</p>}
        <div className="info-actions">
          <Button type="submit" loading={nameBusy}>이름 저장</Button>
        </div>
      </form>
      <form className="info-form" onSubmit={submitPassword}>
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
        {passwordDone && <p className="info-done">{passwordDone}</p>}
        <div className="info-actions">
          <Button type="submit" loading={passwordBusy}>비밀번호 변경</Button>
        </div>
      </form>
    </section>
  );
}
