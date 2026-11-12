import type { AnalysisSentence, AssessmentAnalysis, PurposeQuestion, RubricScores } from "../api/types";
export type UsageMetric = {
  label: string;
  percent: number;
  level: string;
  color: string;
};
export type Warning = {
  id: string;
  label: string;
  time: string;
  type: "window" | "command";
};
export type Assessment = {
  id: string;
  criterion: string;
  score: number | null;
  maxScore: number;
  feedback: string;
  evidence: string[];
};
export type StudentReview = {
  studentContribution: number | null;
  usage: UsageMetric[];
  warnings: Warning[];
  summary: string;
  criteria: Assessment[];
  analysis: Assessment[];
  /** 기준별 점수(AI 추천 + 교사 점수). 서버에서 받았을 때만 있습니다. */
  rubric?: RubricScores | null;
  /** 기여도가 문장 유사도 추정값이면 true(실제 저자 기여율 아님). */
  contributionEstimated?: boolean;
  /** 규칙 기반 AI 활용 분석 원본. */
  analysisDetail?: AssessmentAnalysis | null;
  /** 답안 문장별 출처 판정(서버). 있으면 화면 추정 대신 씁니다. */
  sentences?: AnalysisSentence[];
  /** 질문별 용도 판정. 교사 확인이 필요한 질문을 고르는 데 씁니다. */
  purposeQuestions?: PurposeQuestion[];
};
const analysis: Assessment[] = [
  {
    id: "analysis-0",
    criterion: "AI 활용 목적의 적절성",
    score: 20,
    maxScore: 20,
    feedback:
      "학생은 급식 잔반 문제의 원인을 파악하고 해결 방안을 구체화하기 위해 AI를 활용하였다. 초기에는 잔반 발생 원인과 해결 방법을 탐색하였으며, 이후 소량 배식의 문제점과 학생 선호도 조사 방법에 대해 추가 질문하였다. 이러한 과정에서 AI를 단순한 답안 생성 도구가 아닌 문제 해결을 위한 학습 보조 도구로 적절하게 활용한 것으로 평가된다.",
    evidence: [
      "“학교 급식에서 잔반이 발생하는 주요 원인과 해결 방법을 알려줘.”",
      "“소량 배식의 문제점과 이를 보완할 방법을 알려줘.”",
    ],
  },
  {
    id: "analysis-1",
    criterion: "자기 주도적 사고",
    score: 20,
    maxScore: 20,
    feedback:
      "학생은 AI가 제시한 여러 해결 방안 중 소량 배식 제도가 가장 현실적이라고 스스로 판단하고, 해당 방안의 문제점을 보완하기 위한 추가 질문을 진행하였다. 또한 AI가 제안한 포스터 제작은 실질적인 효과를 확인하기 어렵다는 이유로 제외하였다. AI의 제안을 그대로 수용하지 않고 자신의 판단에 따라 해결 방안을 선택하고 발전시킨 점에서 자기 주도적인 사고가 나타났다.",
    evidence: [
      "“여러 해결 방안 중 나는 소량 배식이 가장 현실적인 방법이라고 생각하였다.”",
      "“잔반 줄이기 포스터 제작은 실제 효과를 확인하기 어렵다고 판단하여 제외하였다.”",
    ],
  },
  {
    id: "analysis-2",
    criterion: "AI 답변의 비판적 검토",
    score: 20,
    maxScore: 20,
    feedback:
      "학생은 AI가 제안한 소량 배식 제도의 장점뿐 아니라 추가 배식으로 인한 대기 시간 증가와 배식 인력의 부담 등 한계점도 검토하였다. 또한 포스터 제작 방안은 효과를 확인하기 어렵다는 이유로 제외하고, 출처가 불명확한 통계 자료는 최종 답안에 사용하지 않았다. 이를 통해 AI의 답변을 비판적으로 검토하려는 태도가 확인되었다. 다만 통계 자료를 직접 검증한 과정은 충분히 나타나지 않아 추가적인 확인이 필요하다.",
    evidence: [
      "“학교 급식에서 잔반이 발생하는 주요 원인과 해결 방법을 알려줘.”",
      "“소량 배식의 문제점과 이를 보완할 방법을 알려줘.”",
    ],
  },
  {
    id: "analysis-3",
    criterion: "AI 활용 목적의 적절성",
    score: 20,
    maxScore: 20,
    feedback:
      "학생은 급식 잔반 문제의 원인을 파악하고 해결 방안을 구체화하기 위해 AI를 활용하였다. 초기에는 잔반 발생 원인과 해결 방법을 탐색하였으며, 이후 소량 배식의 문제점과 학생 선호도 조사 방법에 대해 추가 질문하였다. 이러한 과정에서 AI를 단순한 답안 생성 도구가 아닌 문제 해결을 위한 학습 보조 도구로 적절하게 활용한 것으로 평가된다.",
    evidence: [
      "“AI가 제공한 일부 통계와 사례는 출처를 직접 확인하지 못했기 때문에 최종 답안에는 구체적인 수치를 사용하지 않았다.”",
    ],
  },
  {
    id: "analysis-4",
    criterion: "최종 답안에 대한 학생의 기여",
    score: 20,
    maxScore: 20,
    feedback:
      "학생은 AI가 제안한 해결 방안을 참고하면서도 자신의 판단을 바탕으로 최종 답안을 구성하였다. 소량 배식 제도의 대기 시간 문제를 해결하기 위한 배식 동선 분리, 학생 선호도 조사 결과의 급식 계획 반영, 시행 전후 잔반량 비교 등 구체적인 실행 방법을 제시하였다. 또한 학생의 선택권을 보장하면서 잔반을 줄여야 한다는 자신의 관점을 최종 결론에 반영하였다.",
    evidence: [
      "“배식 동선을 분리하거나 추가 배식 공간을 마련할 필요가 있다.”",
      "“학생의 선택권을 보장하면서 자연스럽게 잔반을 줄일 수 있는 환경을 만드는 것이 중요하다.”",
    ],
  },
  {
    id: "analysis-5",
    criterion: "AI 활용 과정의 투명성",
    score: 20,
    maxScore: 20,
    feedback:
      "학생은 AI에 입력한 주요 질문과 AI로부터 얻은 정보를 구체적으로 설명하였다. 또한 AI의 제안 중 최종 답안에 반영한 내용과 제외한 내용을 구분하고, 각각의 선택 이유를 제시하였다. 이를 통해 AI 활용 과정과 최종 결과물의 관계를 비교적 명확하게 확인할 수 있다. 다만 사용한 AI 도구의 명칭과 전체 대화 기록의 제출 여부는 별도로 확인할 필요가 있다.",
    evidence: [
      "“AI는 추가 배식으로 인한 대기 시간 증가와 배식 인력의 부담을 문제점으로 설명하였다.”",
      "“AI가 제안한 잔반 줄이기 포스터 제작은 최종 해결 방안에서 제외하였다.”",
    ],
  },
];
const criteria = analysis.filter((item) => item.id !== "analysis-3");
export const studentReviews: Record<string, StudentReview> = {
  "student-1": {
    studentContribution: 100,
    usage: [
      { label: "아이디어 탐색", percent: 66, level: "높음", color: "#0059bc" },
      { label: "자료 탐색", percent: 45, level: "보통", color: "#007bff" },
      { label: "개념 이해", percent: 18, level: "낮음", color: "#52a6ff" },
    ],
    warnings: [
      { id: "w1", label: "창 이탈", time: "14:23", type: "window" },
      { id: "w2", label: "답안 작성 명령", time: "14:35", type: "command" },
    ],
    summary:
      "학생은 급식 잔반 문제를 해결하기 위해 AI를 활용하여 다양한 해결 방안을 탐색하고 관련 자료를 조사하였다. 자신의 의견을 바탕으로 AI에 추가 질문을 하며 해결 방안을 구체화하는 등 자기 주도적인 활용 과정이 나타났다. 다만 AI가 제공한 통계 자료의 출처와 신뢰성을 검증한 과정은 충분히 확인되지 않아 보완이 필요하다.",
    criteria,
    analysis,
  },
  "student-2": {
    studentContribution: 85,
    usage: [
      { label: "아이디어 탐색", percent: 50, level: "보통", color: "#0059bc" },
      { label: "자료 탐색", percent: 25, level: "낮음", color: "#007bff" },
      { label: "개념 이해", percent: 60, level: "보통", color: "#52a6ff" },
    ],
    warnings: [],
    summary: "작성 중인 답안입니다. 제출 후 종합 평가를 확인할 수 있습니다.",
    criteria: criteria.map((item) => ({
      ...item,
      score: null,
      feedback: "답안 제출 후 평가 예정입니다.",
      evidence: [],
    })),
    analysis: [],
  },
  "student-3": {
    studentContribution: 92,
    usage: [
      { label: "아이디어 탐색", percent: 75, level: "높음", color: "#0059bc" },
      { label: "자료 탐색", percent: 40, level: "보통", color: "#007bff" },
      { label: "개념 이해", percent: 30, level: "낮음", color: "#52a6ff" },
    ],
    warnings: [],
    summary: "작성 중인 답안입니다. 제출 후 종합 평가를 확인할 수 있습니다.",
    criteria: criteria.map((item) => ({
      ...item,
      score: null,
      feedback: "답안 제출 후 평가 예정입니다.",
      evidence: [],
    })),
    analysis: [],
  },
  "student-4": {
    studentContribution: null,
    usage: [],
    warnings: [
      { id: "s-warning", label: "창 이탈", time: "10:19", type: "window" },
    ],
    summary: "평가 자료가 아직 충분하지 않습니다.",
    criteria: [],
    analysis: [],
  },
};
