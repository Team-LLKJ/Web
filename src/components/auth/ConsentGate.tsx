import { useEffect, useState } from "react";
import { acceptConsents, getConsents } from "../../api/auth";
import { ApiError, apiErrorMessage } from "../../api/client";
import type { Consents } from "../../api/types";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import "./consent-gate.css";

// 페이지를 옮겨도 "나중에"를 다시 묻지 않도록 새로고침 전까지 기억합니다.
let dismissedThisSession = false;

/** 로그인한 교사가 현재 버전의 이용약관·개인정보 처리방침에 동의하지 않았으면 동의를 받습니다. */
export function ConsentGate() {
  const [consents, setConsents] = useState<Consents | null>(null);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(dismissedThisSession);
  const dismiss = () => {
    dismissedThisSession = true;
    setDismissed(true);
  };

  useEffect(() => {
    if (dismissedThisSession) return;
    let active = true;
    getConsents()
      .then((next) => {
        if (active) setConsents(next);
      })
      .catch(() => {
        /* 동의 상태를 못 불러와도 화면 사용은 막지 않습니다. */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!consents?.requiresAcceptance || dismissed) return null;

  async function submit() {
    if (!consents) return;
    setBusy(true);
    try {
      setConsents(await acceptConsents(consents.terms.version, consents.privacy.version));
      setError("");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "POLICY_VERSION_MISMATCH") {
        // 문서 버전이 바뀌었으면 최신 버전을 다시 받아 다시 동의하게 합니다.
        try {
          setConsents(await getConsents());
        } catch {
          /* 아래 안내만 보여 줍니다. */
        }
        setTerms(false);
        setPrivacy(false);
        setError("약관이 새 버전으로 바뀌었어요. 내용을 확인하고 다시 동의해주세요.");
      } else {
        setError(apiErrorMessage(caught, "동의를 저장하지 못했습니다."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="약관 동의"
      className="consent-modal"
      dismissOnBackdrop={false}
      dismissOnEscape={false}
      onClose={dismiss}
      actions={
        <>
          <Button loading={busy} disabled={!terms || !privacy} onClick={() => void submit()}>
            동의하고 계속하기
          </Button>
          <Button variant="secondary" disabled={busy} onClick={dismiss}>
            나중에
          </Button>
        </>
      }
    >
      <div className="consent-body">
        <p>서비스를 이용하려면 아래 문서를 확인하고 각각 동의해주세요.</p>
        <label className="consent-row">
          <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} />
          <span>
            (필수) 이용약관 {consents.terms.version} 동의 ·{" "}
            <a href="/terms" target="_blank" rel="noreferrer">보기</a>
          </span>
        </label>
        <label className="consent-row">
          <input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} />
          <span>
            (필수) 개인정보 처리방침 {consents.privacy.version} 동의 ·{" "}
            <a href="/privacy" target="_blank" rel="noreferrer">보기</a>
          </span>
        </label>
        {error && <p className="input-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
