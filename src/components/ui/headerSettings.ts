import { useSyncExternalStore } from "react";
import { paths } from "../../router/paths";

export type NotificationKind = "system" | "submission" | "evaluation";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  detail: string;
  time: string;
  action?: { label: string; to: string };
};

export const NOTIFICATION_KIND_LABEL: Record<NotificationKind, string> = {
  system: "안내",
  submission: "제출",
  evaluation: "평가",
};

// 서버 알림 API가 생기기 전까지 쓰는 임시 데이터입니다.
export const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  {
    id: "welcome",
    kind: "system",
    title: "LIT에 오신 것을 환영합니다",
    body: "평가 진행 소식이 이곳에 표시됩니다.",
    detail:
      "학생 제출, 평가 종료 같은 수행평가 소식을 이곳에서 모아 볼 수 있습니다. 알림을 받고 싶지 않다면 설정에서 끌 수 있습니다.",
    time: "방금 전",
    action: { label: "알림 설정 열기", to: paths.settings },
  },
  {
    id: "submit",
    kind: "submission",
    title: "답안이 제출되었습니다",
    body: "학생이 답안을 제출하면 알려드립니다.",
    detail:
      "학생이 답안을 제출하면 이 알림이 옵니다. 채점 화면에서 답안과 AI 대화 기록을 함께 확인할 수 있습니다.",
    time: "10분 전",
    action: { label: "내 수행평가 보기", to: paths.evaluations },
  },
  {
    id: "end",
    kind: "evaluation",
    title: "평가가 종료되었습니다",
    body: "종료된 평가는 채점 화면에서 확인할 수 있습니다.",
    detail:
      "평가 시간이 끝나 더 이상 답안을 받을 수 없습니다. 제출하지 못한 학생의 답안은 마지막으로 저장된 내용으로 남습니다.",
    time: "1시간 전",
    action: { label: "내 수행평가 보기", to: paths.evaluations },
  },
];

export function readFlag(key: string, fallback: boolean) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "1";
  } catch {
    return fallback;
  }
}

export function saveFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // 저장소를 쓸 수 없으면 이번 화면에서만 적용합니다.
  }
}

// 헤더 팝업과 알림 화면이 같은 '읽음' 상태를 보도록 한곳에서 관리합니다.
const READ_KEY = "lit:notifications:read";
const listeners = new Set<() => void>();
let readIds = loadReadIds();

function loadReadIds(): string[] {
  try {
    const saved = localStorage.getItem(READ_KEY);
    if (saved) return JSON.parse(saved) as string[];
  } catch {
    // 저장된 값을 읽지 못하면 기본값을 씁니다.
  }
  return SAMPLE_NOTIFICATIONS.slice(2).map((item) => item.id);
}

function setReadIds(next: string[]) {
  readIds = next;
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(next));
  } catch {
    // 저장소를 쓸 수 없으면 이번 화면에서만 적용합니다.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNotificationReads() {
  const read = useSyncExternalStore(subscribe, () => readIds);
  const unreadCount = SAMPLE_NOTIFICATIONS.filter(
    (item) => !read.includes(item.id),
  ).length;
  return {
    isRead: (id: string) => read.includes(id),
    unreadCount,
    markRead: (id: string) => {
      if (!read.includes(id)) setReadIds([...read, id]);
    },
    markAllRead: () => setReadIds(SAMPLE_NOTIFICATIONS.map((item) => item.id)),
  };
}
