import { useSyncExternalStore } from "react";

/** 화면 크기 조건(예: 모바일)에 맞는지 알려 줍니다. 창 크기가 바뀌면 함께 바뀝니다. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
