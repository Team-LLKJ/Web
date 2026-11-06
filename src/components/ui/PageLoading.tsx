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
      {/* 실제 화면 헤더(TeacherHeader)와 같은 구조·클래스로 그려 크기가 바뀌지 않게 합니다. */}
      <header className="header teacher-header page-loading-real-header">
        <a href="/teacher/folders" className="lit-logo-link" aria-label="내 수행평가로 이동">
          <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
        </a>
        <nav aria-label="선생님 도구">
          <span className="icon-button" aria-hidden="true">
            <Icon name="bell" />
          </span>
          <span className="icon-button" aria-hidden="true">
            <Icon name="settings" />
          </span>
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
