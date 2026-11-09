import { ApiError } from "../api/client";
import type { StudentScreen } from "../api/types";

export type ConnectionState =
  "online" | "offline" | "reconnecting" | "restored";

export function screenFor(lobby: {
  screen?: StudentScreen;
  state: string;
}): StudentScreen {
  if (lobby.screen) return lobby.screen;
  if (lobby.state === "WAITING") return "WAITING";
  if (lobby.state === "STARTED") return "SOLVING";
  return "ENDED";
}

// 서버가 평가 종료·만료로 요청을 거절한 경우인지 확인합니다.
export function isEndedError(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.status === 410 || /ENDED|EXPIRED|CLOSED/.test(error.code))
  );
}

// 응답을 받지 못했거나 게이트웨이가 서버에 닿지 못한 경우입니다. 공통 클라이언트가 연결 실패를 cause가 있는 TypeError로 던집니다.
export function isNetworkError(error: unknown) {
  if (error instanceof ApiError) return [502, 503, 504].includes(error.status);
  return error instanceof TypeError && error.cause !== undefined;
}
