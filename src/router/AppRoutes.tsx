import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { Navigate, Route, Routes } from "react-router-dom";
import TeacherGradingPage from "../pages/TeacherGradingPage";
import { StudentFlow } from "../pages/StudentFlow";
import { ViewIndex } from "../pages/ViewIndex";
import { NotFoundPage } from "../pages/NotFoundPage";
import { paths } from "./paths";
export function AppRoutes() {
  return (
    <Routes>
      <Route path={paths.home} element={<LandingPage />} />
      <Route path={paths.login} element={<LoginPage />} />
      <Route path={paths.signup} element={<SignupPage />} />
      <Route path={paths.views} element={<ViewIndex />} />
      <Route path="/student" element={<Navigate to={paths.join} replace />} />
      <Route path={paths.join} element={<StudentFlow route={paths.join} />} />
      <Route
        path={paths.nickname}
        element={<StudentFlow route={paths.nickname} />}
      />
      <Route path={paths.wait} element={<StudentFlow route={paths.wait} />} />
      <Route path={paths.solve} element={<StudentFlow route={paths.solve} />} />
      <Route
        path="/teacher"
        element={<Navigate to={paths.grading} replace />}
      />
      <Route path={paths.grading} element={<TeacherGradingPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
