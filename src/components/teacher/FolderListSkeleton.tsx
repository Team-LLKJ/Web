import { Skeleton } from "../ui/Skeleton";
import { FolderIcon, MoreIcon } from "./folderIcons";

/**
 * 수행평가 카드 자리 표시. 실제 카드와 같은 마크업·아이콘을 쓰고,
 * 데이터가 들어가는 제목과 문항·반 개수만 스켈레톤으로 둡니다.
 */
export function FolderGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="folder-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <article className="folder-card folder-card--skeleton" key={index}>
          <span className="folder-card-link">
            <span className="folder-card-icon">
              <FolderIcon />
            </span>
            <strong>
              <Skeleton style={{ width: "70%", height: "1lh" }} />
            </strong>
            <span className="folder-card-meta">
              <Skeleton style={{ width: "8.5em", height: "1lh" }} />
            </span>
          </span>
          <span className="evaluation-card-actions folder-card-actions">
            <button type="button" tabIndex={-1} disabled>
              <MoreIcon />
            </button>
          </span>
        </article>
      ))}
    </div>
  );
}

/**
 * 첫 화면(앱 시작 전)용 목록 화면. 제목·탭·버튼처럼 항상 같은 부분은 실제 모양 그대로 두고
 * 데이터가 들어갈 카드만 스켈레톤으로 보여 줍니다.
 */
export function FolderListSkeleton() {
  const shared =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "shared";
  return (
    <div aria-hidden="true">
      <div className="teacher-list-title-row">
        <div>
          <h1>내 수행평가</h1>
        </div>
      </div>
      <div className="tab-toolbar folder-toolbar">
        <div className="segment-tabs is-static" role="presentation">
          <button type="button" className={shared ? undefined : "active"} tabIndex={-1}>
            내 수행평가
          </button>
          <button type="button" className={shared ? "active" : undefined} tabIndex={-1}>
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
