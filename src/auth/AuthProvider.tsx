import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  signupStudent as signupStudentRequest,
  signupTeacher as signupTeacherRequest,
} from "../api/auth";
import { clearTokens, hasStoredSession, onSessionLost } from "../api/client";
import { paths } from "../router/paths";
import type { LoginRequest, StudentSignup, TeacherSignup, User } from "../api/types";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const pathRef = useRef("");
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const { pathname } = useLocation();
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  // 로그인이 풀리면(만료·다른 탭에서 로그아웃·서버 재시작) 처음 화면으로 보냅니다.
  useEffect(() => {
    const lost = () => {
      if (userRef.current && /^\/(teacher|settings|notifications)/.test(pathRef.current)) {
        navigate(paths.home, { replace: true });
      }
      setUser(null);
    };
    const offClient = onSessionLost(lost);
    const onStorage = (event: StorageEvent) => {
      if (event.key === "lit:auth:refresh-token" && event.newValue === null) {
        clearTokens();
        lost();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      offClient();
      window.removeEventListener("storage", onStorage);
    };
  }, [navigate]);

  const reloadUser = useCallback(async () => {
    if (!hasStoredSession()) {
      setUser(null);
      return null;
    }
    try {
      const current = await getCurrentUser();
      setUser(current);
      return current;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => reloadUser()).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [reloadUser]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const current = await loginRequest(credentials);
    setUser(current);
    return current;
  }, []);

  const signupStudent = useCallback((payload: StudentSignup) => signupStudentRequest(payload), []);
  const signupTeacher = useCallback((payload: TeacherSignup) => signupTeacherRequest(payload), []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signupStudent, signupTeacher, logout, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

