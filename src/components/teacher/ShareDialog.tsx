import { useEffect, useState, type FormEvent } from "react";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import {
  listCollaborators,
  shareFolder,
  unshareFolder,
  type FolderCollaborator,
} from "../../lib/evaluationFolders";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Skeleton } from "../ui/Skeleton";
import { ShareRoleMenu } from "./ShareRoleMenu";
import "./folder-share.css";

/** 수행평가 공유 창. 목록 카드와 상세 화면에서 같이 씁니다. */
export function ShareDialog({
  folder,
  onClose,
  onCountChange,
  onLeft,
}: {
  folder: { id: string; title: string; role?: "OWNER" | "EDITOR"; owner?: string };
  onClose: () => void;
  /** 공유 인원이 바뀌면 새 인원 수를 알려 줍니다. */
  onCountChange?: (count: number) => void;
  /** 공유받은 선생님이 스스로 나갔을 때. */
  onLeft?: () => void;
}) {
  const { user } = useAuth();
  const isOwner = folder.role !== "EDITOR";
  const [collaborators, setCollaborators] = useState<FolderCollaborator[] | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    listCollaborators(folder.id)
      .then((items) => {
        if (active) setCollaborators(items);
      })
      .catch((caught) => {
        if (!active) return;
        setShareError(apiErrorMessage(caught, "공유 목록을 불러오지 못했습니다."));
        setCollaborators([]);
      });
    return () => {
      active = false;
    };
  }, [folder.id]);

  async function submitShare(event: FormEvent) {
    event.preventDefault();
    const email = shareEmail.trim();
    if (!email) {
      setShareError("공유할 선생님의 이메일을 입력해주세요.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setShareError("올바른 이메일 주소를 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const added = await shareFolder(folder.id, email);
      const next = [...(collaborators ?? []), added];
      setCollaborators(next);
      onCountChange?.(next.length);
      setShareEmail("");
      setShareError("");
    } catch (caught) {
      setShareError(apiErrorMessage(caught, "공유하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function removeShare(target: FolderCollaborator) {
    const leaving = target.teacherId === user?.id;
    setBusy(true);
    try {
      await unshareFolder(folder.id, target.teacherId);
      if (leaving) {
        onLeft?.();
        return;
      }
      const next = (collaborators ?? []).filter((item) => item.teacherId !== target.teacherId);
      setCollaborators(next);
      onCountChange?.(next.length);
    } catch (caught) {
      setShareError(apiErrorMessage(caught, "공유를 해제하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`"${folder.title}" 공유`}
      size="large"
      className="share-modal"
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose}>완료</Button>
        </>
      }
    >
      <div className="share-body">
        {isOwner && (
          <form className="share-add" noValidate onSubmit={submitShare}>
            <span className="share-add-field">
            <input
              type="email"
              className="share-add-input"
              aria-label="공유할 선생님 이메일"
              placeholder="선생님 이메일 추가"
              value={shareEmail}
              disabled={busy}
              aria-invalid={Boolean(shareError)}
              onChange={(event) => {
                setShareEmail(event.target.value);
                setShareError("");
              }}
            />
            </span>
            <Button type="submit" loading={busy} disabled={!shareEmail.trim()}>
              추가
            </Button>
          </form>
        )}
        {shareError && <p className="input-error share-error">{shareError}</p>}
        <ul className="share-people">
          <li>
            <Avatar name={(isOwner ? user?.name : folder.owner) || "?"} size="large" />
            <span className="share-person">
              <strong>
                {isOwner ? `${user?.name ?? ""} (나)` : folder.owner}
              </strong>
              {isOwner && user?.email && <small>{user.email}</small>}
            </span>
            <span className="share-role share-role--fixed">소유자</span>
          </li>
          {!isOwner && user && (
            <li>
              <Avatar name={user.name || user.email || "?"} size="large" />
              <span className="share-person">
                <strong>{`${user.name ?? ""} (나)`}</strong>
                {user.email && <small>{user.email}</small>}
              </span>
              <span className="share-role share-role--fixed">편집자</span>
            </li>
          )}
          {collaborators === null ? (
            <li className="share-people-skeleton" aria-label="공유 멤버를 불러오는 중">
              <Skeleton className="share-skeleton-avatar" />
              <span className="share-person">
                <Skeleton style={{ width: 120, height: 18 }} />
                <Skeleton style={{ width: 180, height: 16 }} />
              </span>
              <Skeleton style={{ width: 48, height: 18 }} />
            </li>
          ) : (
            collaborators
              .filter((item) => isOwner || item.teacherId !== user?.id)
              .map((item) => {
              const me = item.teacherId === user?.id;
              const canEdit = isOwner;
              return (
                <li key={item.teacherId}>
                  <Avatar name={item.name || item.email} size="large" />
                  <span className="share-person">
                    <strong>{me ? `${item.name} (나)` : item.name}</strong>
                    <small>{item.email}</small>
                  </span>
                  {canEdit ? (
                    <ShareRoleMenu
                      label={`${item.name} 권한`}
                      removeLabel={me ? "공유에서 나가기" : "액세스 권한 삭제"}
                      disabled={busy}
                      onRemove={() => void removeShare(item)}
                    />
                  ) : (
                    <span className="share-role share-role--fixed">편집자</span>
                  )}
                </li>
              );
            })
          )}
        </ul>
        <p className="share-note">
          {isOwner
            ? "추가한 선생님은 이 수행평가와 반을 함께 편집하고 채점할 수 있어요."
            : "만든 선생님만 다른 선생님을 추가하거나 뺄 수 있어요."}
        </p>
      </div>
    </Modal>
  );
}
