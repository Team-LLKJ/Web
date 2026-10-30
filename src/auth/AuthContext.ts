import { createContext } from "react";
import type { LoginRequest, StudentSignup, TeacherSignup, User } from "../api/types";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<User>;
  signupStudent: (payload: StudentSignup) => Promise<User>;
  signupTeacher: (payload: TeacherSignup) => Promise<User>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<User | null>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
