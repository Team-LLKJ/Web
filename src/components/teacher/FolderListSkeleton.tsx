import { Skeleton } from "../ui/Skeleton";

/** 수행평가 카드 자리 표시. 실제 카드(folder-card)와 같은 구조·크기입니다. */
export function FolderGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="folder-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
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
          <span className="evaluation-card-actions folder-card-actions folder-list-actions-placeholder">
            {[0, 1, 2].map((action) => (
              <span key={action}>
                <Skeleton style={{ width: 22, height: 22, borderRadius: 6 }} />
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 첫 화면(앱 시작 전)용 목록 화면. 제목·탭·버튼처럼 항상 같은 부분은 실제 모양 그대로 두고
 * 데이터가 들어갈 카드만 스켈레톤으로 보여 줍니다.
 */
export function FolderListSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="teacher-list-title-row">
        <div>
          <h1>내 수행평가</h1>
        </div>
      </div>
      <div className="tab-toolbar folder-toolbar">
        <div className="segment-tabs is-static" role="presentation">
          <button type="button" className="active" tabIndex={-1}>
            내 수행평가
          </button>
          <button type="button" tabIndex={-1}>
            공유된 수행평가
          </button>
        </div>
        <a className="button button--primary primary" href="/teacher/folders/new" tabIndex={-1}>
          수행평가 만들기
        </a>
      </div>
      <FolderGridSkeleton />
    </div>
  );
}
