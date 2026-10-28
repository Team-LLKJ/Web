import { useState } from "react";
import { apiErrorMessage } from "../../api/client";
import { JoinCard } from "./JoinCard";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";
export function NicknameForm({
  initialNickname = "",
  onJoin,
}: {
  initialNickname?: string;
  onJoin: (nickname: string) => Promise<void>;
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <JoinCard
      title="참여 시 표시할 닉네임을 정해주세요"
      onSubmit={async () => {
        if (!nickname.trim()) {
          setError("닉네임을 입력해주세요.");
          return;
        }
        setBusy(true);
        setError("");
        try {
          await onJoin(nickname.trim());
        } catch (reason) {
          setError(apiErrorMessage(reason, "참가 등록에 실패했습니다."));
        } finally {
          setBusy(false);
        }
      }}
    >
      <TextInput
        aria-label="참여 닉네임"
        placeholder="참여 닉네임을 입력해주세요"
        maxLength={20}
        value={nickname}
        error={error}
        onChange={(e) => {
          setNickname(e.target.value);
          setError("");
        }}
      />
      <Button type="submit" size="large" disabled={busy}>
        {busy ? "참여 중…" : "참여하기"}
      </Button>
    </JoinCard>
  );
}
