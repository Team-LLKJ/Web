import { useState } from "react";
import { Link } from "react-router-dom";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { Toast } from "../components/teacher/Toast";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { deleteFolder, listFolders } from "../lib/evaluationFolders";
import "../components/teacher/teacher.css";

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
  const [folders, setFolders] = useState(listFolders);
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  return (
    <main className="teacher-page">
      <TeacherHeader />
      <div className="teacher-page-content">
        <Toast message={notice} tone="info" onClose={() => setNotice("")} />
        <div className="teacher-list-title-row">
          <div>
            <h1>내 수행평가</h1>
            <p className="folder-sub">문제와 내용을 한 번 정해 두고, 반마다 시작하기만 누르세요.</p>
          </div>
          <Link className="button button--primary primary" to="/teacher/folders/new">
            수행평가 만들기
          </Link>
        </div>
        {folders.length ? (
          <div className="folder-grid">
            {folders.map((folder) => {
              return (
                <article className="folder-card" key={folder.id}>
                  <Link className="folder-card-link" to={`/teacher/folders/${folder.id}`}>
                    <span className="folder-card-icon">
                      <FolderIcon />
                    </span>
                    <strong>{folder.title}</strong>
                    <span className="folder-card-meta">
                      문항 {folder.questions.length}개 · 반 {folder.sessions.length}개
                    </span>
                  </Link>
                  <span className="evaluation-card-actions folder-card-actions">
                    <button
                      type="button"
                      aria-label={`${folder.title} 수정`}
                      title="수정"
                      onClick={() => setNotice("수행평가 수정은 서버 API가 준비되면 연결돼요.")}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
                        <path d="M14.5 7.5l3 3" />
                      </svg>
                    </button>
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
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="teacher-list-state">아직 수행평가가 없습니다. 수행평가를 만들어 보세요.</p>
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
                onClick={() => {
                  deleteFolder(deleteTarget.id);
                  setFolders(listFolders());
                  setDeleteTarget(null);
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
