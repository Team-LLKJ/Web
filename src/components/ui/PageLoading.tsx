import { Skeleton, SkeletonStatus } from "./Skeleton";
import { Icon } from "./Icon";
import { FolderListSkeleton } from "../teacher/FolderListSkeleton";
import { TeacherScreenSkeleton } from "../teacher/TeacherScreenSkeleton";
import type { LoadingLayout } from "./loadingLayout";

export function PageLoading({
  layout = "neutral",
}: {
  layout?: LoadingLayout;
}) {
  // 선생님 화면이 아니면 선생님 도구(알림·설정) 없이 로고와 가운데 카드만 보여줍니다.
  if (layout === "plain")
    return (
      <div className="page-loading page-loading--plain" aria-busy="true">
        <header className="header page-loading-real-header">
          <span className="lit-logo-link">
            <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
          </span>
        </header>
        <SkeletonStatus className="page-loading-plain-body" label="화면을 불러오고 있습니다.">
          <Skeleton className="page-loading-plain-card" />
        </SkeletonStatus>
      </div>
    );
  return (
    <div
      className={`page-loading teacher-page screen-loading--${layout}${layout === "grading" ? " grading-workspace" : ""}`}
      aria-busy="true"
    >
      {/* 실제 화면 헤더(TeacherHeader)와 같은 구조·클래스로 그려 크기가 바뀌지 않게 합니다. */}
      <header className="header teacher-header page-loading-real-header">
        <a href="/" className="lit-logo-link" aria-label="처음 화면으로 이동">
          <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
        </a>
        <nav aria-label="선생님 도구">
          <span className="icon-button" aria-hidden="true">
            <Icon name="bell" />
          </span>
          <span className="icon-button" aria-hidden="true">
            <Icon name="settings" />
          </span>
          {layout === "lobby" && <Skeleton className="page-loading-header-action" />}
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
