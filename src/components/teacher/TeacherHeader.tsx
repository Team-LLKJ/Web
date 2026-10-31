import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { IconButton } from "../ui/IconButton";
import { Modal } from "../ui/Modal";

type Props = {
  /** Shows a "나가기" button when provided. */
  onLeave?: () => void;
  /** Page-specific primary actions, rendered last (rightmost). */
  children?: ReactNode;
  className?: string;
};

/** Shared header for every teacher screen: logo, alerts, settings, leave, primary action. */
export function TeacherHeader({ onLeave, children, className = "" }: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [panel, setPanel] = useState<"" | "alerts" | "settings">("");

  return (
    <>
      <header className={`header teacher-header ${className}`}>
        <Link
          to="/"
          className="lit-logo-link"
          aria-label="LIT 홈으로 이동"
        >
          <img src="/lit-logo.png" width="100" height="50" alt="LIT" />
        </Link>
        <nav aria-label="선생님 도구">
          <IconButton label="알림" onClick={() => setPanel("alerts")}>
            <Icon name="bell" />
          </IconButton>
          <IconButton label="설정" onClick={() => setPanel("settings")}>
            <Icon name="settings" />
          </IconButton>
          {onLeave && (
            <Button variant="secondary" onClick={onLeave}>
              나가기
            </Button>
          )}
          {children}
        </nav>
      </header>
      {panel === "alerts" && (
        <Modal title="알림" onClose={() => setPanel("")}>
          <p>새로운 알림이 없습니다.</p>
        </Modal>
      )}
      {panel === "settings" && (
        <Modal
          title="설정"
          onClose={() => setPanel("")}
          actions={
            <Button
              variant="secondary"
              onClick={() => void logout().then(() => navigate("/login"))}
            >
              로그아웃
            </Button>
          }
        >
          <p>{user?.name} 선생님</p>
        </Modal>
      )}
    </>
  );
}
