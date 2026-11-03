import type { AppNotification as ApiNotification } from "../../api/notifications";
import { formatNotificationTime } from "../../hooks/useNotifications";
import { paths } from "../../router/paths";

export type NotificationKind = "system" | "submission" | "evaluation";

/** 화면에 그리는 알림 한 줄. 서버 알림(ApiNotification)을 toNotificationRow로 바꿔 씁니다. */
export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  detail: string;
  time: string;
  read: boolean;
  action?: { label: string; to: string };
};

export const NOTIFICATION_KIND_LABEL: Record<NotificationKind, string> = {
  system: "안내",
  submission: "제출",
  evaluation: "평가",
};

const KIND_BY_TYPE: Record<string, NotificationKind> = {
  SUBMISSION: "submission",
  EVALUATION_ENDED: "evaluation",
  ANALYSIS_DONE: "evaluation",
  GRADING_CONFIRMED: "evaluation",
  WARNING: "system",
  ASSESSMENT_SHARED: "system",
};

/** 서버 알림을 화면용 알림으로 바꿉니다. 평가·수행평가에 연결된 알림은 바로가기를 붙입니다. */
export function toNotificationRow(item: ApiNotification): AppNotification {
  const action = item.evaluationId
    ? { label: "채점 화면 보기", to: `${paths.grading}/${encodeURIComponent(item.evaluationId)}` }
    : item.assessmentId
      ? { label: "수행평가 보기", to: `${paths.folders}/${encodeURIComponent(item.assessmentId)}` }
      : undefined;
  return {
    id: String(item.id),
    kind: KIND_BY_TYPE[item.type] ?? "system",
    title: item.title,
    body: item.body,
    detail: item.body,
    time: formatNotificationTime(item.createdAt),
    read: item.read,
    action,
  };
}

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
