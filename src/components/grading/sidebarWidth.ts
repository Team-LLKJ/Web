export const STUDENTS_WIDTH_KEY = "lit:grading-students-width";
export const DEFAULT_STUDENTS_WIDTH = 280;
export const MIN_STUDENTS_WIDTH = 260;
export const MAX_STUDENTS_WIDTH = 480;

/** 접기(너비 0)는 접기 버튼으로만 합니다. 끌어서 줄일 때는 최소 너비에서 멈춥니다. */
export const clampStudentsWidth = (value: number) =>
  Math.min(MAX_STUDENTS_WIDTH, Math.max(MIN_STUDENTS_WIDTH, Math.round(value)));

export function readStudentsWidth() {
  try {
    const saved = Number(localStorage.getItem(STUDENTS_WIDTH_KEY));
    if (localStorage.getItem(STUDENTS_WIDTH_KEY) === "0") return 0;
    return saved ? clampStudentsWidth(saved) : DEFAULT_STUDENTS_WIDTH;
  } catch {
    return DEFAULT_STUDENTS_WIDTH;
  }
}

export function saveStudentsWidth(value: number) {
  try {
    localStorage.setItem(STUDENTS_WIDTH_KEY, String(value));
  } catch {
    /* 저장할 수 없어도 크기 조절은 계속 됩니다. */
  }
}
