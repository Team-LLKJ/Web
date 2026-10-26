import { useState } from "react";
import { JoinCard } from "./JoinCard";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";
export function NicknameForm({
  initialNickname = "",
  onJoin,
}: {
  initialNickname?: string;
  onJoin: (nickname: string) => void;
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [error, setError] = useState("");
  return (
    <JoinCard
      title="참여 시 표시할 닉네임을 정해주세요"
      onSubmit={() => {
        if (!nickname.trim()) {
          setError("닉네임을 입력해주세요.");
          return;
        }
        onJoin(nickname.trim());
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
      <Button type="submit" size="large">
        참여하기
      </Button>
    </JoinCard>
  );
}
