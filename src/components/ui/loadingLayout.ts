export type LoadingLayout =
  | "list"
  | "folder"
  | "lobby"
  | "assessment-edit"
  | "edit"
  | "form"
  | "results"
  | "grading"
  | "neutral"
  /** 선생님 화면이 아닌 곳(학생·설정·로그인 등): 로고와 가운데 카드만 그립니다. */
  | "plain";

// Shared by the HTML startup renderer and the authentication boundary.
export function getLoadingLayout(pathname: string): LoadingLayout {
  const path = pathname.replace(/\/+$/, "");
  if (!path.startsWith("/teacher")) return "plain";
  if (/^\/teacher(?:\/(?:folders|evaluations))?$/.test(path)) return "list";
  if (/^\/teacher\/folders\/[^/]+\/edit$/.test(path)) return "assessment-edit";
  if (/^\/teacher\/evaluations\/[^/]+\/edit$/.test(path)) return "edit";
  if (/^\/teacher\/(?:folders|evaluations)\/new$/.test(path)) return "form";
  if (/^\/teacher\/evaluations\/[^/]+\/results$/.test(path)) return "results";
  if (/^\/teacher\/grading(?:\/[^/]+)?$/.test(path)) return "grading";
  if (
    /^\/teacher\/folders\/[^/]+\/classes\/[^/]+$/.test(path) ||
    /^\/teacher\/evaluations\/[^/]+$/.test(path)
  )
    return "lobby";
  if (/^\/teacher\/folders\/[^/]+$/.test(path)) return "folder";
  return "neutral";
}
