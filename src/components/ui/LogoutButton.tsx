import { useState } from "react";
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
}: {
  variant?: ButtonVariant;
  size?: "small" | "medium" | "large";
  className?: string;
  /** 로그아웃 뒤 할 일. 없으면 처음 화면으로 이동합니다. */
  onDone?: () => void;
  /** 설정 목록의 한 줄(화살표가 있는 행) 모양으로 보여줍니다. */
  asRow?: boolean;
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
      {asRow ? (
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
      {confirming && (
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
        </Modal>
      )}
    </>
  );
}
