import { lazy, Suspense, useLayoutEffect } from "react";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { Navigate, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import { NotFoundPage } from "../pages/NotFoundPage";
import { paths } from "./paths";
import { PageLoading } from "../components/ui/PageLoading";
import { getLoadingLayout } from "../components/ui/loadingLayout";
import { RequireAuth } from "./RequireAuth";

// 화면별로 코드를 나눠, 처음 열 때 필요한 화면만 받습니다.
const TeacherEvaluationPage = lazy(() => import("../pages/TeacherEvaluationPage").then((m) => ({ default: m.TeacherEvaluationPage })));
const TeacherFoldersPage = lazy(() => import("../pages/TeacherFoldersPage").then((m) => ({ default: m.TeacherFoldersPage })));
const TeacherClassLobbyPage = lazy(() => import("../pages/TeacherClassLobbyPage").then((m) => ({ default: m.TeacherClassLobbyPage })));
const TeacherFolderDetailPage = lazy(() => import("../pages/TeacherFolderDetailPage").then((m) => ({ default: m.TeacherFolderDetailPage })));
const PasswordResetPage = lazy(() => import("../pages/PasswordResetPage").then((m) => ({ default: m.PasswordResetPage })));
const StudentFlow = lazy(() => import("../pages/StudentFlow").then((m) => ({ default: m.StudentFlow })));
const ViewIndex = lazy(() => import("../pages/ViewIndex").then((m) => ({ default: m.ViewIndex })));
const StudentDonePage = lazy(() => import("../pages/StudentDonePage").then((m) => ({ default: m.StudentDonePage })));
const SignupPage = lazy(() => import("../pages/SignupPage").then((m) => ({ default: m.SignupPage })));
const TeacherGradingPage = lazy(() => import("../pages/TeacherGradingPage"));
const NotificationsPage = lazy(() => import("../pages/InfoPages").then((m) => ({ default: m.NotificationsPage })));
const PrivacyPage = lazy(() => import("../pages/InfoPages").then((m) => ({ default: m.PrivacyPage })));
const SettingsPage = lazy(() => import("../pages/InfoPages").then((m) => ({ default: m.SettingsPage })));
const TermsPage = lazy(() => import("../pages/InfoPages").then((m) => ({ default: m.TermsPage })));

function RouteFallback() {
  const { pathname } = useLocation();
  const layout = getLoadingLayout(pathname);
  // 선생님 화면은 해당 화면의 스켈레톤을, 그 밖의 화면은 로고와 카드 모양을 보여줘 빈 화면이 되지 않게 합니다.
  return <PageLoading layout={layout} />;
}

// 새 페이지로 이동하면 맨 위에서 보여줍니다(뒤로 가기는 브라우저가 이전 위치를 되살리게 둡니다).
function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  useLayoutEffect(() => {
    if (navigationType !== "POP") window.scrollTo(0, 0);
  }, [pathname, navigationType]);
  return null;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <ScrollToTop />
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
      <Route path={paths.done} element={<StudentDonePage />} />
      <Route
        path="/teacher"
        element={<Navigate to={paths.evaluations} replace />}
      />
      <Route path={paths.folderCreate} element={<RequireAuth role="TEACHER"><TeacherEvaluationPage folderMode /></RequireAuth>} />
      <Route path={paths.folderEdit} element={<RequireAuth role="TEACHER"><TeacherEvaluationPage folderMode /></RequireAuth>} />
      <Route path={paths.classLobby} element={<RequireAuth role="TEACHER"><TeacherClassLobbyPage /></RequireAuth>} />
      <Route path={paths.folders} element={<RequireAuth role="TEACHER"><TeacherFoldersPage /></RequireAuth>} />
      <Route path={paths.folder} element={<RequireAuth role="TEACHER"><TeacherFolderDetailPage /></RequireAuth>} />
      <Route path={paths.evaluations} element={<Navigate to={paths.folders} replace />} />
      <Route path={paths.grading} element={<RequireAuth role="TEACHER"><TeacherGradingPage /></RequireAuth>} />
      <Route
        path={`${paths.grading}/:evaluationId`}
        element={
          <RequireAuth role="TEACHER">
            <TeacherGradingPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}
