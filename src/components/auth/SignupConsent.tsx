import { useState } from "react";
import { LegalArticles } from "../info/LegalDocument";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import "../info/info.css";
import {
  CONSENT_ITEMS as ITEMS,
  isConsentComplete,
  type ConsentState,
} from "./signupConsentItems";

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
      <path d="m6 12.5 4 4 8-9" />
    </svg>
  );
}

/** 약관 전체 동의 + 필수 항목별 동의. 항목의 '보기'로 전문을 엽니다. */
export function SignupConsent({
  value,
  disabled,
  onChange,
}: {
  value: ConsentState;
  disabled?: boolean;
  onChange: (next: ConsentState) => void;
}) {
  const [viewing, setViewing] = useState<(typeof ITEMS)[number] | null>(null);
  const allChecked = isConsentComplete(value);

  return (
    <fieldset className="signup-consent" disabled={disabled}>
      <legend className="sr-only">약관 동의</legend>
      <label className="signup-consent-all">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(event) =>
            onChange({
              age: event.target.checked,
              terms: event.target.checked,
              privacy: event.target.checked,
            })
          }
        />
        <span className="signup-consent-check">
          <CheckMark />
        </span>
        <strong>약관에 모두 동의합니다</strong>
      </label>
      <ul className="signup-consent-items">
        {ITEMS.map((item) => (
          <li key={item.key}>
            <label>
              <input
                type="checkbox"
                checked={value[item.key]}
                onChange={(event) =>
                  onChange({ ...value, [item.key]: event.target.checked })
                }
              />
              <span className="signup-consent-check">
                <CheckMark />
              </span>
              <span>
                {item.label}{" "}
                <span className="signup-consent-required">(필수)</span>
              </span>
            </label>
            {item.doc && (
              <button
                type="button"
                className="signup-consent-view"
                aria-label={`${item.doc.title} 전문 보기`}
                onClick={() => setViewing(item)}
              >
                보기
              </button>
            )}
          </li>
        ))}
      </ul>
      {viewing?.doc && (
        <Modal
          title={viewing.doc.title}
          className="legal-modal"
          onClose={() => setViewing(null)}
          actions={
            <Button
              onClick={() => {
                onChange({ ...value, [viewing.key]: true });
                setViewing(null);
              }}
            >
              동의하고 닫기
            </Button>
          }
        >
          <div className="legal-modal-body">
            <p className="legal-modal-summary">{viewing.doc.summary}</p>
            <LegalArticles
              doc={viewing.doc}
              idPrefix={`consent-${viewing.key}`}
            />
          </div>
        </Modal>
      )}
    </fieldset>
  );
}
