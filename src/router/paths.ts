export const paths = {
  home: "/",
  login: "/login",
  signup: "/signup",
  resetPassword: "/reset-password",
  views: "/views",
  terms: "/terms",
  privacy: "/privacy",
  settings: "/settings",
  notifications: "/notifications",
  join: "/student/join",
  nickname: "/student/nickname",
  wait: "/student/wait",
  solve: "/student/solve",
  grading: "/teacher/grading",
  folders: "/teacher/folders",
  folderCreate: "/teacher/folders/new",
  folderEdit: "/teacher/folders/:folderId/edit",
  classLobby: "/teacher/folders/:folderId/classes/:sessionId",
  folder: "/teacher/folders/:folderId",
  evaluations: "/teacher/evaluations",
  evaluationCreate: "/teacher/evaluations/new",
  evaluation: "/teacher/evaluations/:evaluationId",
  evaluationEdit: "/teacher/evaluations/:evaluationId/edit",
  results: "/teacher/evaluations/:evaluationId/results",
} as const;

/** 로그인한 사용자가 처음 도착하는 기본 페이지: 교사는 내 수행평가, 학생은 입장 화면. */
export const homePathFor = (role: "TEACHER" | "STUDENT") =>
  role === "TEACHER" ? paths.folders : paths.join;
