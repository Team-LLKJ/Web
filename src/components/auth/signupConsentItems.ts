export type ConsentKey = "age" | "terms" | "privacy";
export type ConsentState = Record<ConsentKey, boolean>;

export const EMPTY_CONSENT: ConsentState = {
  age: false,
  terms: false,
  privacy: false,
};

export const CONSENT_KEYS: ConsentKey[] = ["age", "terms", "privacy"];

export function isConsentComplete(consent: ConsentState) {
  return CONSENT_KEYS.every((key) => consent[key]);
}
