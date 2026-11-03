import {
  SIGNUP_PRIVACY_CONSENT,
  TERMS_DOCUMENT,
  type LegalDocumentData,
} from "../info/legalContent";

export type ConsentKey = "age" | "terms" | "privacy";
export type ConsentState = Record<ConsentKey, boolean>;

export const EMPTY_CONSENT: ConsentState = {
  age: false,
  terms: false,
  privacy: false,
};

export const CONSENT_ITEMS: {
  key: ConsentKey;
  label: string;
  doc?: LegalDocumentData;
}[] = [
  { key: "age", label: "만 14세 이상입니다" },
  { key: "terms", label: "LIT 이용약관 동의", doc: TERMS_DOCUMENT },
  {
    key: "privacy",
    label: "개인정보 수집·이용 동의",
    doc: SIGNUP_PRIVACY_CONSENT,
  },
];

export function isConsentComplete(consent: ConsentState) {
  return CONSENT_ITEMS.every((item) => consent[item.key]);
}
