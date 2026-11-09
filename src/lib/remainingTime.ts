import { useEffect, useState } from "react";

/** 풀이 종료 시각과, 서버 시계가 이 기기 시계와 얼마나 다른지(ms)를 함께 담습니다. */
export type EndInfo = { endsAt: number; offset: number };

export function toEndInfo(endsAt?: string | null, serverNow?: string | null): EndInfo | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return null;
  const server = serverNow ? new Date(serverNow).getTime() : Number.NaN;
  return { endsAt: end, offset: Number.isNaN(server) ? 0 : server - Date.now() };
}

/** 남은 시간(ms). 종료 시각이 없으면 null이고, 매초 갱신합니다. */
export function useRemainingMs(info: EndInfo | null) {
  const [now, setNow] = useState(() => Date.now());
  const active = info !== null;
  useEffect(() => {
    if (!active) return;
    // 폴링으로 info 객체가 계속 새로 만들어져도 타이머는 다시 만들지 않습니다.
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return info ? Math.max(0, info.endsAt - (now + info.offset)) : null;
}

export function formatRemaining(ms: number) {
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** 종료 시각이 30초 이상 늦춰졌으면 늘어난 분(올림 없이 반올림, 최소 1)을 돌려줍니다. */
export function addedMinutes(previous: number | null, next: number) {
  if (previous === null || next - previous < 30_000) return 0;
  return Math.max(1, Math.round((next - previous) / 60_000));
}
