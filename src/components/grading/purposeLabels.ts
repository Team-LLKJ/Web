import type { PurposeType } from "../../api/types";

export const PURPOSE_LABELS: Record<PurposeType | "UNDECIDED", string> = {
  UNDERSTAND: "이해·조사",
  PLAN: "아이디어·구성",
  REVIEW: "비판적 검토",
  EDIT: "표현 수정",
  DRAFT: "답안 생성",
  OTHER: "기타",
  UNDECIDED: "판단 보류",
};
