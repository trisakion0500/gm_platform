import axios, { AxiosRequestConfig } from "axios";
import { env } from "./config/env";
import logger from "./utils/logger";
import { GmEnvelope, GmFailEnvelope, GmSuccessEnvelope, LoginResult, RefreshResult } from "./types";

const http = axios.create({ baseURL: env.gmBaseUrl, timeout: 15000 });

let accessToken: string | null = null;
let refreshToken: string | null = null;
let roleCode: number | null = null;

/** GM Platform이 result!==0으로 응답한 비즈니스 오류. code/message는 CLAUDE.md 오류 코드 표를 그대로 담는다. */
export class GmApiError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
    this.name = "GmApiError";
  }
}

/**
 * 응답 봉투에서 data를 꺼낸다. GmFailEnvelope.result가 리터럴 0이 아닌 number라
 * result!==0 비교만으로는 TS가 유니온을 좁히지 못해 이 헬퍼로 단언을 한 곳에 모은다.
 * @param body GM Platform 응답 봉투
 * @returns 성공 시 data, 실패 시 GmApiError를 던진다
 */
function unwrap<T>(body: GmEnvelope<T>): T {
  if (body.result !== 0)
    throw new GmApiError(body.result, (body as GmFailEnvelope).message);
  return (body as GmSuccessEnvelope<T>).data;
}

let authPromise: Promise<void> | null = null;

/**
 * login()/refresh()를 동시에 여러 요청이 트리거해도 한 번만 실행되도록 직렬화한다.
 * @param fn 실행할 인증 함수
 */
function runExclusive(fn: () => Promise<void>): Promise<void> {
  authPromise ??= fn().finally(() => {
    authPromise = null;
  });
  return authPromise;
}

/**
 * env의 계정으로 로그인해 access_token/refresh_token/role_code를 갱신한다.
 * @returns void
 */
async function login(): Promise<void> {
  const res = await http.post<GmEnvelope<LoginResult>>("/auth/login", {
    login_id: env.gmLoginId,
    password: env.gmPassword,
  });
  const data = unwrap(res.data);
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  roleCode = data.role_code;
  logger.info(`GM Platform 로그인 성공 - login_id=${env.gmLoginId}, role_code=${roleCode}`);
}

/**
 * 기존 refresh_token으로 access_token만 재발급한다.
 * @returns void
 */
async function refresh(): Promise<void> {
  if (!refreshToken) {
    await login();
    return;
  }
  const res = await http.post<GmEnvelope<RefreshResult>>("/auth/refresh", {
    refresh_token: refreshToken,
  });
  const data = unwrap(res.data);
  accessToken = data.access_token;
  roleCode = data.role_code;
}

/**
 * 최초 호출 시 로그인해 access_token을 확보한다. 이미 로그인돼 있으면 아무 것도 하지 않는다.
 * @returns void
 */
async function ensureAuthenticated(): Promise<void> {
  if (accessToken)
    return;
  await runExclusive(login);
}

/**
 * 로그인 계정의 role_code를 반환한다 (미로그인 상태면 먼저 로그인한다).
 * index.ts가 시작 시점에 tool 등록 범위를 정할 때 사용한다.
 * @returns role_code (10/20/30/40)
 */
export async function getRoleCode(): Promise<number> {
  await ensureAuthenticated();
  return roleCode!;
}

/**
 * GM Platform API를 호출한다.
 * access_token 만료(10003) 시 refresh 후 1회 재시도, refresh/session 만료(10008/10009) 시
 * 재로그인 후 1회 재시도한다 — client/의 axios 인터셉터와 동일한 정책을 tool 호출 경로에 맞춰 재구성한 것.
 * @param config axios 요청 설정 (baseURL은 이미 설정돼 있어 url은 /apis/active 형태의 상대경로)
 * @param attempt 재시도 횟수 (내부용, 항상 0으로 호출)
 * @returns 성공 시 봉투의 data
 */
export async function request<T>(config: AxiosRequestConfig, attempt = 0): Promise<T> {
  await ensureAuthenticated();
  try {
    const res = await http.request<GmEnvelope<T>>({
      ...config,
      headers: { ...config.headers, Authorization: `Bearer ${accessToken}` },
    });
    return unwrap(res.data);
  } catch (err) {
    if (!axios.isAxiosError(err) || !err.response)
      throw err;

    const body = err.response.data as Partial<GmFailEnvelope> | undefined;
    const code = body?.result;
    const message = body?.message ?? err.message;

    if (attempt === 0 && code === 10003) {
      await runExclusive(refresh);
      return request<T>(config, attempt + 1);
    }
    if (attempt === 0 && (code === 10008 || code === 10009)) {
      accessToken = null;
      await runExclusive(login);
      return request<T>(config, attempt + 1);
    }
    throw new GmApiError(code ?? 0, message);
  }
}
