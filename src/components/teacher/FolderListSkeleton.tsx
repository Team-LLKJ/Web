import { Skeleton } from "../ui/Skeleton";

export function FolderListSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="folder-list-header">
        <h1 className="folder-list-heading">내 수행평가</h1>
        <a
          className="button button--primary primary folder-list-create"
          href="/teacher/folders/new"
        >
          수행평가 만들기
        </a>
      </div>
      <div className="folder-tabs folder-list-loading-tabs">
        <span className="folder-tab-placeholder is-active">
          내 수행평가 <Skeleton className="folder-list-count-placeholder" />
        </span>
        <span className="folder-tab-placeholder">
          공유된 수행평가 <Skeleton className="folder-list-count-placeholder" />
        </span>
      </div>
      <div className="folder-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="folder-card" key={index}>
            <div className="folder-card-link">
              <Skeleton className="folder-card-icon" />
              <strong>
                <Skeleton className="folder-list-name-placeholder" />
              </strong>
              <span className="folder-card-meta folder-list-meta-placeholder">
                <Skeleton style={{ width: "4.2em", height: "1lh" }} />
                <span>·</span>
                <Skeleton style={{ width: "3em", height: "1lh" }} />
              </span>
            </div>
            <span className="folder-card-actions folder-list-actions-placeholder">
              {[0, 1].map((action) => (
                <span key={action}>
                  <Skeleton
                    style={{ width: 16, height: 16, borderRadius: 4 }}
                  />
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
