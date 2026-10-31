// 서버 알림 API가 생기기 전까지 쓰는 임시 데이터입니다.
export const SAMPLE_NOTIFICATIONS = [
  {
    id: "welcome",
    title: "LIT에 오신 것을 환영합니다",
    body: "평가 진행 소식이 이곳에 표시됩니다.",
    time: "방금 전",
  },
  {
    id: "submit",
    title: "답안이 제출되었습니다",
    body: "학생이 답안을 제출하면 알려드립니다.",
    time: "10분 전",
  },
  {
    id: "end",
    title: "평가가 종료되었습니다",
    body: "종료된 평가는 채점 화면에서 확인할 수 있습니다.",
    time: "1시간 전",
  },
];

export function readFlag(key: string, fallback: boolean) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "1";
  } catch {
    return fallback;
  }
}

export function saveFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // 저장소를 쓸 수 없으면 이번 화면에서만 적용합니다.
  }
}
