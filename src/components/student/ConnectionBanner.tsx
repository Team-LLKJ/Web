import type { ConnectionState } from "../../lib/studentConnection";

export function ConnectionBanner({
  state,
  offlineMessage,
}: {
  state: ConnectionState;
  offlineMessage: string;
}) {
  if (state === "online") return null;
  return (
    <p
      className={`student-connection-banner is-${state}`}
      role="status"
      aria-live="polite"
    >
      {state === "offline"
        ? offlineMessage
        : state === "reconnecting"
          ? "다시 연결 중…"
          : "연결됐어요."}
    </p>
  );
}
