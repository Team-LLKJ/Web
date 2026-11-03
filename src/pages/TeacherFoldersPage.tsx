import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { Toast } from "../components/teacher/Toast";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Tabs } from "../components/ui/Tabs";
import { apiErrorMessage } from "../api/client";
import { FolderListSkeleton } from "../components/teacher/FolderListSkeleton";
import { deleteFolder, listFolders, type EvaluationFolder } from "../lib/evaluationFolders";
import "../components/teacher/teacher.css";
import "../components/teacher/folder-card.css";

function FolderIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6c.5 0 .97.2 1.3.55L11.6 7H18.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function TeacherFoldersPage() {
  const [params, setParams] = useSearchParams();
  const tab: "mine" | "shared" = params.get("tab") === "shared" ? "shared" : "mine";
  const navigate = useNavigate();
  const [folders, setFolders] = useState<EvaluationFolder[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    listFolders()
      .then((items) => {
        if (active) setFolders(items);
      })
      .catch((error) => {
        if (active) {
          setLoadError(apiErrorMessage(error, "수행평가 목록을 불러오지 못했습니다."));
          setFolders([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const mine = (folders ?? []).filter((folder) => !folder.owner);
  const shared = (folders ?? []).filter((folder) => folder.owner);
  const shown = tab === "shared" ? shared : mine;
  const tabItems = useMemo(
    () => [
      { value: "mine" as const, label: `내 수행평가 ${mine.length}` },
      { value: "shared" as const, label: `공유된 수행평가 ${shared.length}` },
    ],
    [mine.length, shared.length],
  );
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  return (
    <main className="teacher-page">
      <TeacherHeader />
      <div className="teacher-page-content">
        <Toast message={notice} tone="info" onClose={() => setNotice("")} />
        {folders === null ? (
          <FolderListSkeleton />
        ) : (
        <>
        <div className="teacher-list-title-row">
          <div>
            <h1>내 수행평가</h1>
          </div>
        </div>
        <div className="folder-toolbar">
          <Tabs
            variant="segment"
            label="수행평가 구분"
            value={tab}
            items={tabItems}
            onChange={(next) => setParams(next === "shared" ? { tab: "shared" } : {})}
          />
          <Link className="button button--primary primary" to="/teacher/folders/new">
            수행평가 만들기
          </Link>
        </div>
        {shown.length ? (
          <div className="folder-grid">
            {shown.map((folder) => {
              return (
                <article className="folder-card" key={folder.id}>
                  <Link className="folder-card-link" to={`/teacher/folders/${folder.id}`}>
                    <span className="folder-card-icon">
                      <FolderIcon />
                    </span>
                    <strong>{folder.title}</strong>
                    <span className="folder-card-meta">
                      {folder.owner ? `${folder.owner} · ` : ""}문항 {folder.questionCount}개 · 반 {folder.sessions.length}개
                    </span>
                  </Link>
                  <span className="evaluation-card-actions folder-card-actions">
                    <button
                      type="button"
                      className="folder-share-action"
                      aria-label={`${folder.title} 공유`}
                      title="공유"
                      onClick={() => navigate(`/teacher/folders/${encodeURIComponent(folder.id)}?share=1`)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="9.5" cy="8" r="3.5" />
                        <path d="M3 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
                        <path d="M19 8v6M16 11h6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label={`${folder.title} 수정`}
                      title="수정"
                      onClick={() => navigate(`/teacher/folders/${encodeURIComponent(folder.id)}/edit`)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
                        <path d="M14.5 7.5l3 3" />
                      </svg>
                    </button>
                    {!folder.owner && (
                    <button
                      type="button"
                      aria-label={`${folder.title} 삭제`}
                      title="삭제"
                      onClick={() => setDeleteTarget({ id: folder.id, title: folder.title })}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 7h16" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M6 7l1 13h10l1-13" />
                        <path d="M9 7V4h6v3" />
                      </svg>
                    </button>
                    )}
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="teacher-list-state">
            {loadError
              ? loadError
              : tab === "shared"
                ? "공유된 수행평가가 없습니다."
                : "아직 수행평가가 없습니다. 수행평가를 만들어 보세요."}
          </p>
        )}
        </>
        )}
      </div>
      {deleteTarget && (
        <Modal
          title="수행평가를 삭제할까요?"
          onClose={() => setDeleteTarget(null)}
          actions={
            <>
              <Button
                variant="white-danger"
                loading={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await deleteFolder(deleteTarget.id);
                    setFolders((current) => (current ?? []).filter((item) => item.id !== deleteTarget.id));
                    setDeleteTarget(null);
                  } catch (error) {
                    setDeleteTarget(null);
                    setNotice(apiErrorMessage(error, "수행평가를 삭제하지 못했습니다."));
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                삭제
              </Button>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                취소
              </Button>
            </>
          }
        >
          <p>“{deleteTarget.title}” 수행평가와 모든 반별 기록이 삭제되며 되돌릴 수 없습니다.</p>
        </Modal>
      )}
    </main>
  );
}
