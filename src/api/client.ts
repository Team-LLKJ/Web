import axios, { type AxiosResponse } from "axios";
import type { Tokens } from "./types";
import {
  clearParticipantCredentials,
  getParticipantToken,
} from "../data/studentSession";

const ACCESS_TOKEN_KEY = "lit:auth:access-token";
const REFRESH_TOKEN_KEY = "lit:auth:refresh-token";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);

export class ApiError extends Error {
  status: number;
  code: string;
  payload: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  responseType?: "json" | "blob";
  /** blob 응답의 Accept 값. 없으면 QR 이미지용 image/png입니다. */
  accept?: string;
  retryOnUnauthorized?: boolean;
  participant?: boolean;
  participantEvaluationId?: string;
  /** 저장소 대신 이 토큰을 씁니다(제출 후 리포트처럼 참가 정보를 지운 뒤 요청할 때). */
  participantToken?: string;
};

function storageGet(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage: Storage, key: string, value: string | null) {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    // The API client remains usable in private browsing modes with blocked storage.
  }
}

let accessToken =
  typeof window === "undefined"
    ? null
    : storageGet(window.sessionStorage, ACCESS_TOKEN_KEY);
let refreshInFlight: Promise<string | null> | null = null;

export function getAccessToken() {
  return accessToken;
}

export function hasStoredSession() {
  if (accessToken) return true;
  return (
    typeof window !== "undefined" &&
    Boolean(storageGet(window.localStorage, REFRESH_TOKEN_KEY))
  );
}

export function setTokens(tokens: Tokens) {
  accessToken = tokens.accessToken;
  if (typeof window !== "undefined") {
    storageSet(window.sessionStorage, ACCESS_TOKEN_KEY, tokens.accessToken);
    storageSet(window.localStorage, REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

// 로그인이 풀렸을 때(만료·다른 탭 로그아웃·서버 재시작) 화면에 알려 처음 화면으로 보냅니다.
const sessionLostListeners = new Set<() => void>();
export function onSessionLost(listener: () => void) {
  sessionLostListeners.add(listener);
  return () => {
    sessionLostListeners.delete(listener);
  };
}
function notifySessionLost() {
  sessionLostListeners.forEach((listener) => listener());
}

export function clearTokens() {
  accessToken = null;
  if (typeof window !== "undefined") {
    storageSet(window.sessionStorage, ACCESS_TOKEN_KEY, null);
    storageSet(window.localStorage, REFRESH_TOKEN_KEY, null);
  }
}

async function readError(
  response: AxiosResponse<string | Blob>,
): Promise<ApiError> {
  let payload: unknown;
  try {
    payload = JSON.parse(
      typeof response.data === "string"
        ? response.data
        : await response.data.text(),
    );
  } catch {
    payload = undefined;
  }
  const errorBody =
    payload && typeof payload === "object"
      ? (payload as { code?: unknown; message?: unknown; errorCode?: unknown })
      : {};
  // AI 질문 실패는 { code, message } 대신 Turn(errorCode)으로 내려오기도 합니다.
  const code =
    typeof errorBody.code === "string"
      ? errorBody.code
      : typeof errorBody.errorCode === "string"
        ? errorBody.errorCode
        : `HTTP_${response.status}`;
  const message =
    typeof errorBody.message === "string"
      ? errorBody.message
      : `요청에 실패했습니다. (${response.status})`;
  return new ApiError(response.status, code, message, payload);
}

// 갱신 토큰은 탭끼리 같이 쓰고 서버가 쓸 때마다 새로 바꿔 줍니다.
// 여러 탭이 동시에 갱신하면 늦은 탭이 이미 바뀐 옛 토큰을 보내 로그아웃되므로,
// 탭끼리 순서대로 갱신하고 다른 탭이 바꿔 둔 새 토큰이 있으면 그걸로 다시 시도합니다.
async function requestRefresh(refreshToken: string) {
  const response = await send(
    "/api/auth/refresh",
    {
      method: "POST",
      body: { refreshToken },
      auth: false,
    },
    null,
  );
  if (response.status < 200 || response.status >= 300) throw await readError(response);
  return JSON.parse(response.data as string) as Tokens;
}

async function refreshWithLatestToken(): Promise<string | null> {
  let used: string | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const refreshToken = storageGet(window.localStorage, REFRESH_TOKEN_KEY);
    if (!refreshToken || refreshToken === used) break;
    used = refreshToken;
    try {
      const tokens = await requestRefresh(refreshToken);
      setTokens(tokens);
      return tokens.accessToken;
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) return null;
      // 그사이 다른 탭이 토큰을 바꿨다면 새 토큰으로 한 번 더 시도합니다.
    }
  }
  // 다른 탭이 이미 새 토큰을 받아 둔 경우는 그 탭의 로그인을 지우지 않습니다.
  if (storageGet(window.localStorage, REFRESH_TOKEN_KEY) === used) {
    clearTokens();
    notifySessionLost();
  } else accessToken = null;
  return null;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  if (typeof window === "undefined") return null;
  if (!storageGet(window.localStorage, REFRESH_TOKEN_KEY)) {
    if (accessToken) {
      accessToken = null;
      notifySessionLost();
    }
    return null;
  }

  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  refreshInFlight = (
    locks
      ? locks.request("lit:auth:refresh", () => refreshWithLatestToken())
      : refreshWithLatestToken()
  ).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function send(
  path: string,
  options: RequestOptions,
  token: string | null,
) {
  const headers = new Headers(options.headers);
  headers.set(
    "Accept",
    options.responseType === "blob"
      ? (options.accept ?? "image/png")
      : "application/json",
  );
  if (options.body !== undefined)
    headers.set("Content-Type", "application/json");
  if (options.auth !== false && token)
    headers.set("Authorization", `Bearer ${token}`);
  if (options.participant) {
    const participantToken =
      options.participantToken ?? getParticipantToken(options.participantEvaluationId);
    if (participantToken) headers.set("X-Participant-Token", participantToken);
  }

  const requestHeaders: Record<string, string> = {};
  headers.forEach((value, key) => {
    requestHeaders[key] = value;
  });
  try {
    return await axios.request<string | Blob>({
      url: `${API_BASE_URL}${path}`,
      method: options.method ?? "GET",
      headers: requestHeaders,
      data:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      responseType: options.responseType === "blob" ? "blob" : "text",
      signal: options.signal ?? undefined,
      withCredentials: options.credentials === "include",
      validateStatus: () => true,
    });
  } catch (error) {
    if (axios.isCancel(error))
      throw new DOMException("요청이 취소되었습니다.", "AbortError");
    if (axios.isAxiosError(error))
      throw new TypeError("API 서버에 연결할 수 없습니다.", { cause: error });
    throw error;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (
    options.participant &&
    !options.participantToken &&
    !getParticipantToken(options.participantEvaluationId)
  ) {
    throw new ApiError(
      401,
      "PARTICIPANT_TOKEN_MISSING",
      "참가 정보가 만료되었습니다. PIN과 닉네임으로 다시 참가해주세요.",
    );
  }
  const auth = options.auth !== false;
  let token = accessToken;
  if (auth && !token) token = await refreshAccessToken();

  let response = await send(path, options, token);
  if (
    response.status === 401 &&
    auth &&
    options.retryOnUnauthorized !== false &&
    path !== "/api/auth/refresh"
  ) {
    const refreshed = await refreshAccessToken();
    // 갱신에 실패하면 refreshAccessToken이 필요한 경우에만 로그인 정보를 지웁니다.
    if (refreshed) response = await send(path, options, refreshed);
  }
  if (response.status < 200 || response.status >= 300) {
    const error = await readError(response);
    if (
      options.participant &&
      (response.status === 401 || error.code === "PARTICIPANT_TOKEN_REQUIRED")
    ) {
      clearParticipantCredentials();
    }
    throw error;
  }
  if (options.responseType === "blob") return response.data as T;
  if (response.status === 204) return undefined as T;
  const text = response.data as string;
  return (text ? JSON.parse(text) : undefined) as T;
}

export function apiErrorMessage(
  error: unknown,
  fallback = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError)
    return "API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.";
  return fallback;
}

export type StreamEvent = { id: string; event: string; data: string };

/**
 * 서버가 보내는 SSE를 Bearer 헤더로 구독합니다(EventSource는 헤더를 못 보내서 fetch를 씁니다).
 * 연결이 끝나거나 실패하면 Promise가 끝나며, 다시 연결할지는 호출하는 쪽이 정합니다.
 * 응답 상태가 2xx가 아니면 ApiError를 던집니다.
 */
export async function readEventStream(
  path: string,
  options: {
    signal: AbortSignal;
    lastEventId?: string;
    onOpen?: () => void;
    onEvent: (event: StreamEvent) => void;
  },
): Promise<void> {
  const open = async (token: string | null) =>
    fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.lastEventId ? { "Last-Event-ID": options.lastEventId } : {}),
      },
      signal: options.signal,
    });
  let token = accessToken;
  if (!token) token = await refreshAccessToken();
  let response = await open(token);
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) response = await open(refreshed);
  }
  if (!response.ok || !response.body) {
    throw new ApiError(response.status, `HTTP_${response.status}`, "실시간 연결을 열지 못했습니다.");
  }
  options.onOpen?.();
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let id = "";
  let event = "";
  let data: string[] = [];
  const flush = () => {
    if (data.length || event) options.onEvent({ id, event: event || "message", data: data.join("\n") });
    event = "";
    data = [];
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let index: number;
    while ((index = buffer.search(/\r\n|\n|\r/)) >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + (buffer.startsWith("\r\n", index) ? 2 : 1));
      if (line === "") flush();
      else if (line.startsWith(":")) continue;
      else {
        const colon = line.indexOf(":");
        const field = colon < 0 ? line : line.slice(0, colon);
        const content = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "id") id = content;
        else if (field === "event") event = content;
        else if (field === "data") data.push(content);
      }
    }
  }
}
