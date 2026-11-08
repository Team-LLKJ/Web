import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { TeacherHeader } from "../components/teacher/TeacherHeader";
import { Toast } from "../components/teacher/Toast";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Tabs } from "../components/ui/Tabs";
import { apiErrorMessage } from "../api/client";
import { FolderGridSkeleton } from "../components/teacher/FolderListSkeleton";
import { deleteFolder, getCachedFolders, listFolders, type EvaluationFolder } from "../lib/evaluationFolders";
import "../components/teacher/teacher.css";
import "../components/teacher/folder-card.css";
import { ShareDialog } from "../components/teacher/ShareDialog";
import { FolderIcon } from "../components/teacher/folderIcons";
import { MoreMenu } from "../components/teacher/MoreMenu";
import { BulkReportDialog } from "../components/grading/BulkReportDialog";
import { downloadFolderReports } from "../lib/classReports";
import "../components/teacher/more-menu.css";

export function TeacherFoldersPage() {
  const [params, setParams] = useSearchParams();
  const tab: "mine" | "shared" = params.get("tab") === "shared" ? "shared" : "mine";
  const navigate = useNavigate();
  const [folders, setFolders] = useState<EvaluationFolder[] | null>(() => getCachedFolders());
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
      { value: "mine" as const, label: folders ? `내 수행평가 ${mine.length}` : "내 수행평가" },
      { value: "shared" as const, label: folders ? `공유된 수행평가 ${shared.length}` : "공유된 수행평가" },
    ],
    [folders, mine.length, shared.length],
  );
  const [notice, setNotice] = useState("");
  const [shareTarget, setShareTarget] = useState<EvaluationFolder | null>(null);
  const [bulkFolder, setBulkFolder] = useState<EvaluationFolder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  return (
    <main className="teacher-page">
      <TeacherHeader />
      <div className="teacher-page-content">
        <Toast message={notice} tone="info" onClose={() => setNotice("")} />
        <div className="teacher-list-title-row">
          <div>
            <h1>내 수행평가</h1>
          </div>
        </div>
        <div className="tab-toolbar folder-toolbar">
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
        {folders === null ? (
          <FolderGridSkeleton />
        ) : shown.length ? (
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
                    <MoreMenu
                      label={`${folder.title} 더보기`}
                      items={[
                        { label: "공유하기", onClick: () => setShareTarget(folder) },
                        {
                          label: "수정하기",
                          onClick: () => navigate(`/teacher/folders/${encodeURIComponent(folder.id)}/edit`),
                        },
                        {
                          label: "폴더 전체 저장",
                          onClick: () => setBulkFolder(folder),
                          hidden: !folder.sessions.some((session) => session.state === "ENDED"),
                        },
                        {
                          label: "삭제하기",
                          onClick: () => setDeleteTarget({ id: folder.id, title: folder.title }),
                          danger: true,
                          hidden: Boolean(folder.owner),
                        },
                      ]}
                    />
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          loadError ? (
            <EmptyState
              icon="alert"
              title="수행평가를 불러오지 못했어요"
              description={loadError}
            />
          ) : tab === "shared" ? (
            <EmptyState
              icon="sharedFolder"
              title="공유받은 수행평가가 없어요"
              description="다른 선생님이 수행평가를 공유하면 여기에 보여요."
            />
          ) : (
            <EmptyState
              icon="folder"
              title="아직 만든 수행평가가 없어요"
              description="수행평가를 만들고 반을 추가해 평가를 시작해 보세요."
              action={
                <Link className="button button--primary primary" to="/teacher/folders/new">
                  수행평가 만들기
                </Link>
              }
            />
          )
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
      {bulkFolder && (
        <BulkReportDialog
          title={`${bulkFolder.title} 전체 보고서 저장`}
          classes={bulkFolder.sessions
            .filter((session) => session.state === "ENDED")
            .map((session) => ({ id: session.id, name: session.className }))}
          hwp
          onSaveAll={(format, onProgress) =>
            downloadFolderReports(
              bulkFolder.title,
              bulkFolder.sessions
                .filter((session) => session.state === "ENDED")
                .map((session) => ({ id: session.id, name: session.className })),
              format,
              onProgress,
            )
          }
          onClose={() => setBulkFolder(null)}
        />
      )}
      {shareTarget && (
        <ShareDialog
          folder={shareTarget}
          onClose={() => setShareTarget(null)}
          onCountChange={(count) =>
            setFolders((current) =>
              (current ?? []).map((item) =>
                item.id === shareTarget.id ? { ...item, collaboratorCount: count } : item,
              ),
            )
          }
          onLeft={() => {
            setFolders((current) => (current ?? []).filter((item) => item.id !== shareTarget.id));
            setShareTarget(null);
          }}
        />
      )}
    </main>
  );
}
