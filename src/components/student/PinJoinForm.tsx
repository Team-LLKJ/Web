import { useState } from "react";
import { JoinCard } from "./JoinCard";
import { PinInput } from "./PinInput";
import { Button } from "../ui/Button";
export function PinJoinForm({
  initialPin = "",
  onJoin,
}: {
  initialPin?: string;
  onJoin: (pin: string) => void;
}) {
  const [pin, setPin] = useState(initialPin);
  const [error, setError] = useState("");
  return (
    <JoinCard
      title="PIN 번호로 참여하기"
      onSubmit={() => {
        if (!/^\d{6}$/.test(pin)) {
          setError("6자리 PIN 번호를 입력해주세요.");
          return;
        }
        onJoin(pin);
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
      <Button type="submit" size="large">
        참여하기
      </Button>
    </JoinCard>
  );
}
