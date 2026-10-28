import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  signupStudent as signupStudentRequest,
  signupTeacher as signupTeacherRequest,
} from "../api/auth";
import { clearTokens, hasStoredSession } from "../api/client";
import type { LoginRequest, StudentSignup, TeacherSignup, User } from "../api/types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<User>;
  signupStudent: (payload: StudentSignup) => Promise<User>;
  signupTeacher: (payload: TeacherSignup) => Promise<User>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    void reloadUser().finally(() => setLoading(false));
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth는 AuthProvider 안에서 사용해야 합니다.");
  return context;
}

