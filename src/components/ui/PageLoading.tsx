import { Skeleton, SkeletonStatus } from "./Skeleton";
import { FolderListSkeleton } from "../teacher/FolderListSkeleton";
import { TeacherScreenSkeleton } from "../teacher/TeacherScreenSkeleton";
import type { LoadingLayout } from "./loadingLayout";

const labels: Record<LoadingLayout, string> = {
  list: "내 수행평가 목록을 불러오고 있습니다.",
  folder: "평가 정보와 반별 평가를 불러오고 있습니다.",
  lobby: "참여 PIN과 참가자 목록을 불러오고 있습니다.",
  edit: "평가 수정 화면을 불러오고 있습니다.",
  form: "평가 작성 화면을 불러오고 있습니다.",
  results: "평가 학습 기록을 불러오고 있습니다.",
  grading: "학생 답안과 평가 자료를 불러오고 있습니다.",
  neutral: "화면을 불러오고 있습니다.",
};

export function PageLoading({
  layout = "neutral",
}: {
  layout?: LoadingLayout;
}) {
  return (
    <div
      className={`page-loading teacher-page screen-loading--${layout}${layout === "grading" ? " grading-workspace" : ""}`}
      aria-busy="true"
    >
      <header className="page-loading-header" aria-hidden="true">
        <img src="/lit-logo.png" width="76" height="38" alt="" />
        <div className="page-loading-header-tools">
          {layout === "lobby" || layout === "results" ? (
            <Skeleton style={{ width: 120, height: 38 }} />
          ) : null}
          <Skeleton className="page-loading-icon" />
          <Skeleton className="page-loading-icon" />
        </div>
      </header>
      <SkeletonStatus
        className={`teacher-page-content${layout === "form" ? " teacher-page-content--create" : ""}${layout === "grading" ? " screen-loading-grading-content" : ""}`}
        label={labels[layout]}
      >
        {layout === "list" ? (
          <FolderListSkeleton />
        ) : (
          <TeacherScreenSkeleton layout={layout} />
        )}
      </SkeletonStatus>
    </div>
  );
}
