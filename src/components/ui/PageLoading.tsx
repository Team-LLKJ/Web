import { Skeleton, SkeletonStatus } from "./Skeleton";
import { FolderListSkeleton } from "../teacher/FolderListSkeleton";

type Props = {
  layout?: "folder" | "list" | "detail";
};

// Linked from index.html so the same skeleton is visible before React starts.
function LoadingCard() {
  return (
    <div className="page-loading-panel page-loading-card" aria-hidden="true">
      <Skeleton className="page-loading-subheading" />
      <Skeleton className="page-loading-line" />
      <Skeleton className="page-loading-line page-loading-line--short" />
      <Skeleton className="page-loading-action" />
    </div>
  );
}

export function PageLoading({ layout = "detail" }: Props) {
  return (
    <main className="page-loading" aria-busy="true">
      <header className="page-loading-header" aria-hidden="true">
        <img src="/lit-logo.png" width="76" height="38" alt="" />
        <div className="page-loading-header-tools">
          <Skeleton className="page-loading-icon" />
          <Skeleton className="page-loading-icon" />
        </div>
      </header>
      <SkeletonStatus
        className="page-loading-content"
        label={
          layout === "list"
            ? "내 수행평가 목록을 불러오고 있습니다."
            : "화면을 불러오고 있습니다."
        }
      >
        {layout !== "list" && (
          <div className="page-loading-title" aria-hidden="true">
            <Skeleton className="page-loading-back" />
            <Skeleton className="page-loading-heading" />
          </div>
        )}
        {layout === "list" ? (
          <FolderListSkeleton />
        ) : (
          <>
            {Array.from({ length: 2 }, (_, index) => (
              <div
                className="page-loading-panel"
                aria-hidden="true"
                key={index}
              >
                <Skeleton className="page-loading-subheading" />
                <Skeleton className="page-loading-line" />
                <Skeleton className="page-loading-line" />
                <Skeleton className="page-loading-line page-loading-line--short" />
              </div>
            ))}
            <div className="page-loading-cards">
              <LoadingCard />
            </div>
          </>
        )}
      </SkeletonStatus>
    </main>
  );
}
