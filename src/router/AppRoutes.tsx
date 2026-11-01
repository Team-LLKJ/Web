import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { Navigate, Route, Routes } from "react-router-dom";
import { TeacherEvaluationPage } from "../pages/TeacherEvaluationPage";
import { TeacherEvaluationEditPage } from "../pages/TeacherEvaluationEditPage";
import TeacherGradingPage from "../pages/TeacherGradingPage";
import { TeacherResultsPage } from "../pages/TeacherResultsPage";
import { MyEvaluationsPage } from "../pages/MyEvaluationsPage";
import { PasswordResetPage } from "../pages/PasswordResetPage";
import { StudentFlow } from "../pages/StudentFlow";
import { ViewIndex } from "../pages/ViewIndex";
import { NotFoundPage } from "../pages/NotFoundPage";
import {
  NotificationsPage,
  PrivacyPage,
  SettingsPage,
  TermsPage,
} from "../pages/InfoPages";
import { paths } from "./paths";
import { RequireAuth } from "./RequireAuth";
export function AppRoutes() {
  return (
    <Routes>
      <Route path={paths.home} element={<LandingPage />} />
      <Route path={paths.login} element={<LoginPage />} />
      <Route path={paths.signup} element={<SignupPage />} />
      <Route path={paths.resetPassword} element={<PasswordResetPage />} />
      <Route path={paths.views} element={<ViewIndex />} />
      <Route path={paths.terms} element={<TermsPage />} />
      <Route path={paths.privacy} element={<PrivacyPage />} />
      <Route path={paths.settings} element={<SettingsPage />} />
      <Route path={paths.notifications} element={<NotificationsPage />} />
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
        element={<Navigate to={paths.evaluations} replace />}
      />
      <Route path={paths.evaluations} element={<RequireAuth role="TEACHER"><MyEvaluationsPage /></RequireAuth>} />
      <Route path={paths.evaluationCreate} element={<RequireAuth role="TEACHER"><TeacherEvaluationPage /></RequireAuth>} />
      <Route path={paths.results} element={<RequireAuth role="TEACHER"><TeacherResultsPage /></RequireAuth>} />
      <Route path={paths.evaluationEdit} element={<RequireAuth role="TEACHER"><TeacherEvaluationEditPage /></RequireAuth>} />
      <Route path={paths.evaluation} element={<RequireAuth role="TEACHER"><TeacherEvaluationPage /></RequireAuth>} />
      <Route path={paths.grading} element={<TeacherGradingPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
