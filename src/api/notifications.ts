import { apiRequest } from "./client";
import type { PageResponse } from "./types";

// 교사 알림과 사용자 설정 API. 학생은 계정이 없어 알림 대상이 아닙니다.
export type NotificationType =
  | "SUBMISSION"
  | "EVALUATION_ENDED"
  | "WARNING"
  | "ANALYSIS_DONE"
  | "ASSESSMENT_SHARED"
  | "GRADING_CONFIRMED";

export type AppNotification = {
  id: number;
  type: NotificationType | string;
  title: string;
  body: string;
  evaluationId: string | null;
  /** 수행평가(틀) id. 공유 알림처럼 특정 반이 없는 알림은 이 값만 있습니다. */
  assessmentId?: string | null;
  participantId: string | null;
  createdAt: string;
  read: boolean;
  readAt: string | null;
};

export type NotificationPage = PageResponse<AppNotification> & {
  unreadCount: number;
};

export type UserSettings = {
  notify: boolean;
  sound: boolean;
  updatedAt: string | null;
};

export const getNotifications = (page = 0, size = 20, unreadOnly = false) =>
  apiRequest<NotificationPage>(
    `/api/notifications?${new URLSearchParams({
      page: String(page),
      size: String(size),
      unreadOnly: String(unreadOnly),
    })}`,
  );

export const getUnreadCount = () =>
  apiRequest<{ unreadCount: number }>("/api/notifications/unread-count");

export const markNotificationRead = (id: number) =>
  apiRequest<AppNotification>(`/api/notifications/${id}/read`, { method: "PATCH" });

export const markAllNotificationsRead = () =>
  apiRequest<{ updated: number; unreadCount: number }>("/api/notifications/read-all", {
    method: "POST",
  });

export const getUserSettings = () => apiRequest<UserSettings>("/api/users/me/settings");

export const saveUserSettings = (settings: { notify?: boolean; sound?: boolean }) =>
  apiRequest<UserSettings>("/api/users/me/settings", {
    method: "PUT",
    body: settings,
  });
