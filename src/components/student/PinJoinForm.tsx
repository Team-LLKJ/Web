import { useState } from "react";
import { apiErrorMessage } from "../../api/client";
import { JoinCard } from "./JoinCard";
import { PinInput } from "./PinInput";
import { StudentLeaveButton } from "./StudentLeaveButton";
import { Button } from "../ui/Button";
export function PinJoinForm({
  initialPin = "",
  onJoin,
  onLeave,
}: {
  initialPin?: string;
  onJoin: (pin: string) => Promise<void>;
  onLeave: () => void;
}) {
  const [pin, setPin] = useState(initialPin);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <StudentLeaveButton onLeave={onLeave} disabled={busy} />
      <JoinCard
        title="PIN 번호로 참여하기"
        onSubmit={async () => {
          if (busy) return;
          if (!/^\d{6}$/.test(pin)) {
            setError("6자리 PIN 번호를 입력해주세요.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            await onJoin(pin.trim());
          } catch (reason) {
            setError(apiErrorMessage(reason, "평가를 확인하지 못했습니다."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <PinInput
          value={pin}
          onChange={(value) => {
            setPin(value);
            setError("");
          }}
          error={error}
        />
        <Button type="submit" size="large" loading={busy}>
          {busy ? "확인 중…" : "참여하기"}
        </Button>
      </JoinCard>
    </>
  );
}
