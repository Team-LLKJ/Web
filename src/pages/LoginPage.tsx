import { useState } from "react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthForm } from "../components/auth/AuthForm";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
export function LoginPage() {
  const [resetOpen, setResetOpen] = useState(false);
  return (
    <>
      <AuthLayout mode="login">
        <AuthForm mode="login" onResetPassword={() => setResetOpen(true)} />
      </AuthLayout>
      {resetOpen && (
        <Modal
          title="비밀번호 재설정"
          onClose={() => setResetOpen(false)}
          actions={<Button onClick={() => setResetOpen(false)}>확인</Button>}
        >
          <p>비밀번호 재설정 서비스는 아직 연결되지 않았습니다.</p>
        </Modal>
      )}
    </>
  );
}
