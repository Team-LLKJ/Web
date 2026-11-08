import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "../api/notifications";

const POLL_MS = 2_000;

/** "방금 전", "5분 전", "3시간 전", "2일 전"처럼 읽기 쉬운 시간으로 바꿉니다. */
export function formatNotificationTime(iso: string, now = Date.now()) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  if (seconds < 60) return "방금 전";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(time).toLocaleDateString("ko-KR");
}

/** 알림 짧은 신호음. 브라우저가 소리를 막으면 조용히 넘어갑니다. */
export function playAlertSound() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
    oscillator.onended = () => void context.close();
  } catch {
    /* 소리를 낼 수 없는 환경입니다. */
  }
}

/**
 * 교사 알림 목록과 안 읽은 개수를 불러옵니다. enabled가 false면 요청하지 않습니다.
 * onNewUnread는 안 읽은 알림이 새로 늘었을 때(첫 로딩 제외) 한 번 호출됩니다.
 */
export function useNotifications(enabled: boolean, onNewUnread?: () => void) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previousUnread = useRef<number | null>(null);
  const onNewUnreadRef = useRef(onNewUnread);
  useEffect(() => {
    onNewUnreadRef.current = onNewUnread;
  });

  const loadingRef = useRef(false);
  const reload = useCallback(async () => {
    // 이전 요청이 끝나기 전에는 겹쳐 요청하지 않습니다.
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const page = await getNotifications(0, 20);
      setItems(page.items);
      setUnread(page.unreadCount);
      setError("");
      if (previousUnread.current !== null && page.unreadCount > previousUnread.current) {
        onNewUnreadRef.current?.();
      }
      previousUnread.current = page.unreadCount;
    } catch {
      setError("알림을 불러오지 못했습니다.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const run = () => {
      if (active && document.visibilityState === "visible") void reload();
    };
    run();
    const timer = window.setInterval(run, POLL_MS);
    document.addEventListener("visibilitychange", run);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
    };
  }, [enabled, reload]);

  const markRead = useCallback(async (id: number) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    setUnread((current) => Math.max(0, current - 1));
    previousUnread.current = Math.max(0, (previousUnread.current ?? 1) - 1);
    try {
      await markNotificationRead(id);
    } catch {
      void reload();
    }
  }, [reload]);

  const markAllRead = useCallback(async () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    setUnread(0);
    previousUnread.current = 0;
    try {
      await markAllNotificationsRead();
    } catch {
      void reload();
    }
  }, [reload]);

  /** 알림 하나 삭제. 실패하면 목록을 다시 받아 오고 오류를 다시 던집니다. */
  const remove = useCallback(async (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    try {
      const result = await deleteNotification(id);
      setUnread(result.unreadCount);
      previousUnread.current = result.unreadCount;
    } catch (caught) {
      void reload();
      throw caught;
    }
  }, [reload]);

  const removeAll = useCallback(async () => {
    const result = await deleteAllNotifications();
    setItems([]);
    setUnread(result.unreadCount);
    previousUnread.current = result.unreadCount;
  }, []);

  return { items, unread, loading, error, reload, markRead, markAllRead, remove, removeAll };
}
