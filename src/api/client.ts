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
  retryOnUnauthorized?: boolean;
  participant?: boolean;
  participantEvaluationId?: string;
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
      ? (payload as { code?: unknown; message?: unknown })
      : {};
  const code =
    typeof errorBody.code === "string"
      ? errorBody.code
      : `HTTP_${response.status}`;
  const message =
    typeof errorBody.message === "string"
      ? errorBody.message
      : `요청에 실패했습니다. (${response.status})`;
  return new ApiError(response.status, code, message, payload);
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  if (typeof window === "undefined") return null;
  const refreshToken = storageGet(window.localStorage, REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const response = await send(
        "/api/auth/refresh",
        {
          method: "POST",
          body: { refreshToken },
          auth: false,
        },
        null,
      );
      if (response.status < 200 || response.status >= 300) {
        const error = await readError(response);
        if (response.status === 401) clearTokens();
        throw error;
      }
      const tokens = JSON.parse(response.data as string) as Tokens;
      setTokens(tokens);
      return tokens.accessToken;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) clearTokens();
      return null;
    }
  })().finally(() => {
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
    options.responseType === "blob" ? "image/png" : "application/json",
  );
  if (options.body !== undefined)
    headers.set("Content-Type", "application/json");
  if (options.auth !== false && token)
    headers.set("Authorization", `Bearer ${token}`);
  if (options.participant) {
    const participantToken = getParticipantToken(
      options.participantEvaluationId,
    );
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
    if (refreshed) response = await send(path, options, refreshed);
    else clearTokens();
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
