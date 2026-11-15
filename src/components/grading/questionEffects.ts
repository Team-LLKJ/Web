// 질문 용도 분류 결과로, 질문 하나하나가 각 평가 기준에 어떤 영향을 줬는지 사람이 읽을 수 있게 설명합니다.
import type { PurposeQuestion, PurposeType } from "../../api/types";
import { PURPOSE_LABELS } from "./purposeLabels";

type CriterionKey = "PURPOSE" | "SELF_DIRECTION" | "CRITICAL_REVIEW" | "CONTRIBUTION" | "TRANSPARENCY";

/** 질문이 이 용도로 분류된 이유(질문의 어떤 점을 봤는지) */
const WHY: Record<PurposeType | "UNDECIDED", string> = {
  UNDERSTAND: "모르는 개념이나 사례·자료를 알려 달라고 물어본 질문이에요.",
  PLAN: "무엇을 쓸지, 어떤 방향으로 구성할지 정하는 데 도움을 받으려는 질문이에요.",
  REVIEW: "AI가 앞서 한 말이 맞는지, 근거가 어디 있는지 되물어 확인하는 질문이에요.",
  EDIT: "이미 쓴 문장의 표현을 다듬어 달라는 질문이에요.",
  DRAFT: "답안에 들어갈 내용을 AI가 대신 써 달라는 요청이에요.",
  OTHER: "과제 내용이 아니라 평가 방식이나 기능에 대한 질문이에요.",
  UNDECIDED: "AI 판정이 엇갈려 아직 용도를 정하지 못한 질문이에요.",
};

/** 질문에서 그 용도로 볼 수 있는 표현(근거로 강조해 보여줍니다). */
const CUES: Record<PurposeType, RegExp[]> = {
  REVIEW: [
    /(방금|앞에서|아까|위에서)\s?(알려준|말한|한|준)[^,.?!]{0,8}/g,
    /(진짜|사실|정말|맞는|맞)(야|이야|아|인지|는지|나요|니)\??/g,
    /(근거|출처|신뢰)[가는를이도]?[^,.?!]{0,12}/g,
  ],
  UNDERSTAND: [
    /[^\s,.?!]+\s?(알려\s?줘|알려\s?주세요|설명해\s?줘|뭐야|무엇이야|뭐가\s?있어|어떤\s?것들이\s?있어)/g,
    /(원인|이유|사례|통계|자료|개념|뜻|차이|방법)(?:에는|은|는|이|가|을|를|에)?/g,
  ],
  PLAN: [
    /(어떻게|뭘|무엇을)\s?(쓸|써야|구성|정리할)[^,.?!]{0,8}/g,
    /(주제|방향|구성|개요|아이디어|고르)[^\s,.?!]{0,6}/g,
  ],
  EDIT: [/(다듬|고쳐|바꿔|자연스럽게|맞춤법|표현)[^\s,.?!]{0,6}/g],
  DRAFT: [/[^\s,.?!]*\s?(써\s?줘|써\s?주세요|써\s?줄래|작성해\s?줘|정리해서\s?써\s?줘|대신\s?써|완성해\s?줘)/g],
  OTHER: [/(점수|제출|평가\s?방식|채점|시간)[^\s,.?!]{0,6}/g],
};

export function findCues(text: string, purpose: PurposeType): string[] {
  const found: string[] = [];
  for (const pattern of CUES[purpose]) {
    for (const match of text.matchAll(pattern)) {
      const cue = match[0].trim();
      if (cue.length >= 2 && !found.some((f) => f.includes(cue) || cue.includes(f))) found.push(cue);
    }
  }
  return found.slice(0, 3);
}

/** 이 용도로 정해진 경로(누가 어떻게 판정했는지) */
function verdictOf(q: PurposeQuestion): string {
  if (q.teacherPurpose) return "선생님이 직접 정한 용도예요.";
  const label = (v: string) => PURPOSE_LABELS[v as PurposeType] ?? v;
  const votes = q.votes ?? [];
  if (votes.length) {
    const same = votes.every((v) => v === votes[0]);
    const head = same
      ? `Gemini ${votes.length}번 판정 모두 '${label(votes[0])}'`
      : `Gemini ${votes.length}번 판정 ${votes.map(label).join(" · ")}`;
    return q.haikuPurpose ? `${head}, 엇갈려 Haiku가 '${label(q.haikuPurpose)}'로 확인했어요.` : `${head}이에요.`;
  }
  if (q.method === "KEYWORD_FALLBACK") return "AI 분류 전이라 질문 속 낱말로 임시 분류했어요.";
  return "";
}

/** 기준별로 용도가 점수에 주는 영향. 없으면 그 기준과 관계없는 질문입니다. */
const EFFECT: Record<CriterionKey, Partial<Record<PurposeType, { kind: "가점" | "감점"; text: string }>>> = {
  PURPOSE: {
    UNDERSTAND: { kind: "가점", text: "이 평가는 개념 설명과 풀이 방향 힌트를 허용해요. 내용을 이해하려는 질문은 그 범위 안이라 목적에 맞는 활용이에요." },
    PLAN: { kind: "가점", text: "답을 받지 않고 쓸 방향만 도움받은 질문이라, 힌트 범위 안의 목적에 맞는 활용이에요." },
    REVIEW: { kind: "가점", text: "AI 답변을 그대로 쓰지 않고 맞는지 확인하는 데 썼기 때문에 목적에 맞는 활용이에요." },
    DRAFT: { kind: "감점", text: "답안을 대신 쓰게 하는 것은 허용된 활용 목적(힌트·개념 설명)을 벗어나 아쉬운 점이에요." },
  },
  SELF_DIRECTION: {
    DRAFT: { kind: "감점", text: "스스로 생각을 정리하기 전에 답안 작성을 AI에게 맡긴 것으로 보여요." },
  },
  CRITICAL_REVIEW: {
    REVIEW: { kind: "가점", text: "AI 답변을 그대로 믿지 않고 사실과 근거를 확인하려 한 점이 잘한 점이에요." },
    DRAFT: { kind: "감점", text: "AI가 써 준 내용을 검토 없이 받으려는 요청이라 아쉬운 점이에요." },
  },
  CONTRIBUTION: {},
  TRANSPARENCY: {},
};

/** 기준 이름(또는 서버 키)을 기준 키로 바꿉니다. */
export function criterionKey(nameOrKey: string): CriterionKey | null {
  if (nameOrKey in EFFECT) return nameOrKey as CriterionKey;
  if (nameOrKey.includes("목적")) return "PURPOSE";
  if (nameOrKey.includes("주도")) return "SELF_DIRECTION";
  if (nameOrKey.includes("비판")) return "CRITICAL_REVIEW";
  if (nameOrKey.includes("기여")) return "CONTRIBUTION";
  if (nameOrKey.includes("투명")) return "TRANSPARENCY";
  return null;
}

export type QuestionEffect = {
  conversationId: number;
  quote: string;
  /** 질문에서 이 용도의 근거가 된 표현 */
  cues: string[];
  /** 판정 경로(Gemini 판정 결과 등) */
  verdict: string;
  purposeLabel: string;
  why: string;
  kind: "가점" | "감점" | null;
  effect: string | null;
};

/** 이 기준에 영향을 준 질문들(영향이 있는 질문 먼저). 기준과 관계없는 기준이면 빈 배열. */
export function questionEffects(criterion: string, questions: PurposeQuestion[]): QuestionEffect[] {
  const key = criterionKey(criterion);
  if (!key || !Object.keys(EFFECT[key]).length) return [];
  return questions
    .map((q) => {
      const purpose = q.teacherPurpose ?? q.purpose;
      // 답안을 써 달라고 했지만 AI가 거절했고 답안에도 쓰이지 않았으면 감점하지 않습니다(서버 판정과 같음).
      const refused = purpose === "DRAFT" && q.aiComplied === false;
      const effect = purpose === "UNDECIDED" || refused ? undefined : EFFECT[key][purpose];
      return {
        conversationId: q.conversationId,
        quote: q.quote,
        cues: purpose === "UNDECIDED" ? [] : findCues(q.quote, purpose),
        verdict: verdictOf(q),
        purposeLabel: PURPOSE_LABELS[purpose],
        why: refused ? `${WHY[purpose]} AI가 거절해 답안에는 쓰이지 않았어요.` : WHY[purpose],
        kind: effect?.kind ?? null,
        effect: effect?.text ?? null,
      };
    })
    .sort((a, b) => Number(Boolean(b.kind)) - Number(Boolean(a.kind)));
}
