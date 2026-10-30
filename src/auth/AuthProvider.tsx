import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  signupStudent as signupStudentRequest,
  signupTeacher as signupTeacherRequest,
} from "../api/auth";
import { clearTokens, hasStoredSession } from "../api/client";
import type { LoginRequest, StudentSignup, TeacherSignup, User } from "../api/types";
import { AuthContext } from "./AuthContext";

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

