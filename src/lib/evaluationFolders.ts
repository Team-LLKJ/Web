// 평가 폴더(평가 틀) 임시 저장소입니다. 서버 API가 생기기 전까지 이 기기의 localStorage에만 저장합니다.
export type SessionState = "READY" | "IN_PROGRESS" | "ENDED";

export type FolderSession = {
  id: string;
  className: string;
  state: SessionState;
  participants: number;
  submitted: number;
  startedAt?: string;
  expiresInMinutes?: number;
};

export type EvaluationFolder = {
  id: string;
  title: string;
  description: string;
  aiPolicy: "DISABLED" | "HINT_ONLY" | "FULL";
  questions: string[];
  criteria?: string[];
  antiCheat?: string[];
  createdAt: string;
  sessions: FolderSession[];
};

const KEY = "lit.evaluation-folders.v1";

const SEED: EvaluationFolder[] = [
  {
    id: "folder-sample-1",
    title: "2학기 국어 수행평가",
    description: "제시문을 읽고 자신의 생각을 논리적으로 서술하세요.",
    aiPolicy: "HINT_ONLY",
    questions: [
      "제시문의 중심 생각을 한 문장으로 요약하세요.",
      "글쓴이의 주장에 대한 자신의 의견을 근거와 함께 쓰세요.",
      "이 글과 연결되는 경험을 한 가지 들어 설명하세요.",
    ],
    createdAt: "2026-10-28T09:00:00.000Z",
    sessions: [
      { id: "s-1", className: "2학년 1반", state: "ENDED", participants: 28, submitted: 28 },
      { id: "s-2", className: "2학년 2반", state: "IN_PROGRESS", participants: 27, submitted: 9, startedAt: "2026-10-31T01:10:00.000Z" },
      { id: "s-3", className: "2학년 3반", state: "READY", participants: 0, submitted: 0 },
    ],
  },
  {
    id: "folder-sample-2",
    title: "과학 탐구 보고서",
    description: "실험 결과를 바탕으로 결론을 정리하세요.",
    aiPolicy: "DISABLED",
    questions: ["실험 목적과 가설을 쓰세요.", "결과를 분석하고 결론을 쓰세요."],
    createdAt: "2026-10-30T09:00:00.000Z",
    sessions: [],
  },
];

function read(): EvaluationFolder[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as EvaluationFolder[];
  } catch {
    /* 저장소를 못 읽으면 예시 데이터로 보여 줍니다. */
  }
  return SEED;
}

function write(folders: EvaluationFolder[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(folders));
  } catch {
    /* 저장 실패는 무시합니다(임시 데이터). */
  }
}

const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;

export const listFolders = () => read();
export const getFolder = (id: string) => read().find((f) => f.id === id) ?? null;

export type NewFolderInput = {
  title: string;
  description: string;
  aiPolicy: EvaluationFolder["aiPolicy"];
  questions: string[];
  criteria?: string[];
  antiCheat?: string[];
};

export function createFolder(input: NewFolderInput): EvaluationFolder {
  const folder: EvaluationFolder = {
    id: uid("folder"),
    ...input,
    createdAt: new Date().toISOString(),
    sessions: [],
  };
  write([folder, ...read()]);
  return folder;
}

export function deleteFolder(id: string) {
  write(read().filter((f) => f.id !== id));
}

function updateFolder(id: string, change: (f: EvaluationFolder) => EvaluationFolder) {
  write(read().map((f) => (f.id === id ? change(f) : f)));
}

export function addSession(folderId: string, className: string) {
  updateFolder(folderId, (f) => ({
    ...f,
    sessions: [
      ...f.sessions,
      { id: uid("s"), className, state: "READY", participants: 0, submitted: 0 },
    ],
  }));
}

export function setSessionState(
  folderId: string,
  sessionId: string,
  state: SessionState,
  expiresInMinutes?: number,
) {
  updateFolder(folderId, (f) => ({
    ...f,
    sessions: f.sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            state,
            startedAt: state === "IN_PROGRESS" ? new Date().toISOString() : s.startedAt,
            expiresInMinutes: expiresInMinutes ?? s.expiresInMinutes,
          }
        : s,
    ),
  }));
}

export function removeSession(folderId: string, sessionId: string) {
  updateFolder(folderId, (f) => ({
    ...f,
    sessions: f.sessions.filter((s) => s.id !== sessionId),
  }));
}
