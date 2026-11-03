import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { getUserSettings, saveUserSettings } from "../api/notifications";
import { readFlag, saveFlag } from "../components/ui/headerSettings";

type Flags = { notify: boolean; sound: boolean };

const KEYS = { notify: "lit:setting:notify", sound: "lit:setting:sound" } as const;

/**
 * 알림 설정. 선생님 계정은 서버(/api/users/me/settings)에 저장하고,
 * 계정이 없는 화면(학생 등)에서는 이 기기에만 저장합니다.
 */
export function useUserSettings() {
  const { user } = useAuth();
  const remote = user?.role === "TEACHER";
  const [flags, setFlags] = useState<Flags>(() => ({
    notify: readFlag(KEYS.notify, true),
    sound: readFlag(KEYS.sound, true),
  }));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!remote) return;
    let active = true;
    getUserSettings()
      .then((settings) => {
        if (active) setFlags({ notify: settings.notify, sound: settings.sound });
      })
      .catch(() => {
        /* 불러오지 못하면 이 기기에 저장된 값을 그대로 보여 줍니다. */
      });
    return () => {
      active = false;
    };
  }, [remote]);

  const update = useCallback(
    async (key: keyof Flags, value: boolean) => {
      const before = flags;
      setFlags({ ...flags, [key]: value });
      setError("");
      saveFlag(KEYS[key], value);
      if (!remote) return;
      try {
        const saved = await saveUserSettings(
          key === "notify" ? { notify: value } : { sound: value },
        );
        setFlags({ notify: saved.notify, sound: saved.sound });
      } catch {
        setFlags(before);
        saveFlag(KEYS[key], before[key]);
        setError("설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    },
    [flags, remote],
  );

  return {
    notify: flags.notify,
    sound: flags.sound,
    error,
    setNotify: (value: boolean) => update("notify", value),
    setSound: (value: boolean) => update("sound", value),
  };
}
