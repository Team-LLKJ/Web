export type StudentStatus = "제출완료" | "작성중" | "경고";
export type Question = { id: number; title: string; content: string };
export type Answer = {
  questionId: number;
  paragraphs: string[];
  /** 서버가 내려준 서식 있는 답안(HTML). 있으면 학생 화면과 같은 편집기 모양으로 보여줍니다. */
  html?: string;
};
export type Message = { id: string; role: "user" | "ai"; content: string; pending?: boolean };
export type Activity = { id: string; time: string; description: string };
export type Rubric = {
  id: string;
  criterion: string;
  score: number | null;
  maxScore: number;
  feedback: string;
};
export type Student = {
  id: string;
  name: string;
  color: string;
  status: StudentStatus;
  submittedAt: string | null;
  answers: Answer[];
  messages: Message[];
  activities: Activity[];
  rubric: Rubric[];
};
export const questions: Question[] = [
  {
    id: 1,
    title: "문항 1",
    content:
      "우리 학교에서 발생하는 급식 잔반 문제의 원인을 분석하고, 이를 줄이기 위한 실현 가능한 해결 방안을 두 가지 이상 제안하시오. 각 해결 방안의 기대 효과와 한계점을 구체적으로 설명하시오.",
  },
  {
    id: 2,
    title: "문항 2",
    content:
      "제안한 급식 잔반 감소 방안의 효과를 확인하기 위한 실험 계획을 작성하시오. 측정할 항목과 비교 방법을 설명하시오.",
  },
];
const originalAnswer = [
  "우리 학교의 급식 잔반 문제는 학생마다 음식의 선호도와 식사량이 다르지만, 이를 충분히 반영하지 못하는 배식 방식에서 발생한다고 생각한다. 또한 급식 메뉴에 대한 학생들의 의견을 수집하고 반영하는 과정이 부족한 것도 원인 중 하나이다.",
  "첫 번째 해결 방안은 소량 배식과 추가 배식 제도를 운영하는 것이다. 처음에는 학생이 먹을 수 있는 양만큼 배식하고, 부족한 학생에게는 추가 배식을 제공하는 방식이다. 이를 통해 먹지 못하고 버리는 음식의 양을 줄일 수 있다. 다만 추가 배식을 기다리는 시간이 길어질 수 있으므로 배식 동선을 분리하거나 추가 배식 공간을 마련할 필요가 있다.",
  "두 번째 해결 방안은 학생 선호도 조사를 통한 급식 메뉴 개선이다. 매월 간단한 설문조사를 실시하여 학생들이 선호하는 메뉴와 남기는 음식의 종류를 파악하고, 그 결과를 급식 계획에 참고하는 것이다. 이를 통해 학생들의 만족도를 높이고 잔반을 줄일 수 있을 것으로 기대한다. 그러나 선호도가 높은 메뉴만 제공하면 영양 균형이 무너질 수 있으므로 영양 기준을 우선적으로 고려해야 한다.",
  "이 두 가지 방법을 함께 시행한 뒤 시행 전후의 잔반량을 비교하면 실제 효과를 확인할 수 있을 것이다. 나는 학생들이 무조건 음식을 남기지 않도록 강요하기보다, 학생의 선택권을 보장하면서 자연스럽게 잔반을 줄일 수 있는 환경을 만드는 것이 중요하다고 생각한다.",
];

// 학생별 예시 데이터. 실제 연동 시 동일한 형태의 API 데이터로 교체합니다.
export const students: Student[] = [
  {
    id: "student-1",
    name: "이하랑",
    color: "#ffd4d3",
    status: "제출완료",
    submittedAt: "2026. 10. 15",
    answers: [
      { questionId: 1, paragraphs: originalAnswer },
      {
        questionId: 2,
        paragraphs: [
          "소량 배식을 도입하기 전과 후 각각 일주일 동안 급식 잔반의 무게를 측정하겠습니다.",
          "학생 수와 메뉴가 비슷한 날을 비교하고, 1인당 잔반량과 학생 만족도 설문 결과를 함께 분석하겠습니다.",
        ],
      },
    ],
    messages: [
      {
        id: "h1",
        role: "user",
        content: "급식 잔반을 줄이는 방법에는 무엇이 있을까?",
      },
      {
        id: "h2",
        role: "ai",
        content:
          "잔반의 원인을 먼저 살펴보세요. 배식량과 메뉴 선호도를 각각 조사해 볼 수 있습니다.",
      },
      {
        id: "h3",
        role: "user",
        content: "소량 배식과 추가 배식을 함께 운영하면 좋겠어.",
      },
    ],
    activities: [
      { id: "ha1", time: "10:05", description: "평가 참여" },
      { id: "ha2", time: "10:12", description: "문항 1 답안 작성" },
      { id: "ha3", time: "10:30", description: "답안 제출" },
    ],
    rubric: [
      {
        id: "hr1",
        criterion: "원인 분석",
        score: 4,
        maxScore: 5,
        feedback:
          "배식 방식과 학생 의견 수렴의 문제를 구체적으로 분석했습니다.",
      },
      {
        id: "hr2",
        criterion: "해결 방안의 실현 가능성",
        score: 5,
        maxScore: 5,
        feedback: "추가 배식 공간과 영양 균형까지 고려했습니다.",
      },
    ],
  },
  {
    id: "student-2",
    name: "이정연",
    color: "#ffd4d3",
    status: "작성중",
    submittedAt: null,
    answers: [
      {
        questionId: 1,
        paragraphs: [
          "급식 잔반의 원인은 학생들이 원하는 양보다 많은 음식을 받기 때문이라고 생각한다.",
          "배식 전에 원하는 양을 선택하게 하고, 남은 음식의 종류를 기록하여 메뉴를 개선하면 좋겠다.",
        ],
      },
    ],
    messages: [
      {
        id: "j1",
        role: "user",
        content: "학생들이 원하는 배식량을 어떻게 조사하면 좋을까?",
      },
      {
        id: "j2",
        role: "ai",
        content:
          "많이, 보통, 적게처럼 간단한 선택지를 제시하거나 짧은 설문을 활용할 수 있습니다.",
      },
    ],
    activities: [
      { id: "ja1", time: "10:07", description: "평가 참여" },
      { id: "ja2", time: "10:18", description: "문항 1 작성 중" },
    ],
    rubric: [
      {
        id: "jr1",
        criterion: "원인 분석",
        score: null,
        maxScore: 5,
        feedback: "답안 제출 후 평가 예정입니다.",
      },
    ],
  },
  {
    id: "student-3",
    name: "김도현",
    color: "#e2f0ff",
    status: "작성중",
    submittedAt: null,
    answers: [
      {
        questionId: 1,
        paragraphs: [
          "학생들이 싫어하는 메뉴가 나오는 날에 잔반이 많이 발생한다. 매월 메뉴 선호도 조사를 실시하고 결과를 급식 계획에 반영해야 한다.",
          "잔반을 줄인 학급에 보상을 주는 캠페인도 제안한다. 다만 경쟁 때문에 억지로 먹지 않도록 주의해야 한다.",
        ],
      },
      {
        questionId: 2,
        paragraphs: [
          "캠페인 참여 학급과 참여하지 않은 학급의 1인당 잔반량을 비교하겠다.",
        ],
      },
    ],
    messages: [
      {
        id: "d1",
        role: "user",
        content: "잔반 줄이기 캠페인의 한계점은 무엇일까?",
      },
      {
        id: "d2",
        role: "ai",
        content:
          "보상에만 의존하거나 학생들에게 식사를 강요하지 않도록 설계하는 것이 중요합니다.",
      },
    ],
    activities: [
      { id: "da1", time: "10:06", description: "평가 참여" },
      { id: "da2", time: "10:21", description: "문항 2 작성 시작" },
    ],
    rubric: [],
  },
  {
    id: "student-4",
    name: "정서진",
    color: "#52a6ff",
    status: "경고",
    submittedAt: null,
    answers: [
      {
        questionId: 1,
        paragraphs: [
          "급식 잔반을 줄이려면 음식의 양을 스스로 조절할 수 있어야 한다. 잔반이 발생하는 이유를 먼저 설문으로 확인하고 싶다.",
        ],
      },
    ],
    messages: [
      {
        id: "s1",
        role: "user",
        content: "잔반 문제를 분석하려면 어떤 자료가 필요할까?",
      },
    ],
    activities: [
      { id: "sa1", time: "10:08", description: "평가 참여" },
      { id: "sa2", time: "10:19", description: "평가 화면 이탈 경고" },
    ],
    rubric: [],
  },
];
