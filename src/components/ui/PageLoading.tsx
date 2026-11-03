import { SkeletonStatus } from "./Skeleton";
import { Icon } from "./Icon";
import { FolderListSkeleton } from "../teacher/FolderListSkeleton";
import { TeacherScreenSkeleton } from "../teacher/TeacherScreenSkeleton";
import type { LoadingLayout } from "./loadingLayout";

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
      <header className="page-loading-header">
        <a href="/teacher/evaluations" aria-label="내 수행평가로 이동">
          <img src="/lit-logo.png" width="76" height="38" alt="LIT" />
        </a>
        <nav aria-label="선생님 도구">
          <a href="/notifications" aria-label="알림">
            <Icon name="bell" />
          </a>
          <a href="/settings" aria-label="설정">
            <Icon name="settings" />
          </a>
          {layout !== "list" &&
            layout !== "edit" &&
            layout !== "assessment-edit" && (
              <a className="page-loading-exit" href="/teacher/evaluations">
                나가기
              </a>
            )}
        </nav>
      </header>
      <SkeletonStatus
        className={`teacher-page-content${layout === "form" || layout === "assessment-edit" ? " teacher-page-content--create" : ""}${layout === "grading" ? " screen-loading-grading-content" : ""}`}
        label="데이터를 불러오고 있습니다."
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
