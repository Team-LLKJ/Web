import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { paths } from "../../router/paths";
import { Button, type ButtonVariant } from "./Button";
import { Modal } from "./Modal";

/** 로그아웃 버튼. 누르면 확인 창을 먼저 띄우고, 확인하면 로그아웃합니다. */
export function LogoutButton({
  variant = "secondary",
  size = "medium",
  className = "",
  onDone,
  asRow = false,
  asText = false,
}: {
  variant?: ButtonVariant;
  size?: "small" | "medium" | "large";
  className?: string;
  /** 로그아웃 뒤 할 일. 없으면 처음 화면으로 이동합니다. */
  onDone?: () => void;
  /** 설정 목록의 한 줄(화살표가 있는 행) 모양으로 보여줍니다. */
  asRow?: boolean;
  /** 버튼 모양 없이 글씨만 보여줍니다(팝오버 제목 옆 등). */
  asText?: boolean;
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await logout();
      setConfirming(false);
      if (onDone) onDone();
      else navigate(paths.home);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {asText ? (
        <button type="button" className="header-popover-link header-popover-link--danger" onClick={() => setConfirming(true)}>
          로그아웃
        </button>
      ) : asRow ? (
        <button type="button" className="settings-link-row settings-link-button settings-link-button--danger" onClick={() => setConfirming(true)}>
          <span>로그아웃</span>
          <svg className="info-chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      ) : (
        <Button variant={variant} size={size} className={className} onClick={() => setConfirming(true)}>
          로그아웃
        </Button>
      )}
      {confirming &&
        // 헤더 안의 버튼 스타일(회색 알약 등)이 확인 창 버튼에 번지지 않도록 body에 그립니다.
        createPortal(
        <Modal
          title="로그아웃할까요?"
          onClose={() => {
            if (!busy) setConfirming(false);
          }}
          actions={
            <>
              <Button variant="white-danger" loading={busy} onClick={() => void confirm()}>
                로그아웃
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
                취소
              </Button>
            </>
          }
        >
          <p>다시 이용하려면 로그인해야 해요.</p>
        </Modal>,
          document.body,
        )}
    </>
  );
}
