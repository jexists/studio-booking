// 백엔드(NestJS) 호출용 공용 함수. 주소는 NEXT_PUBLIC_API_URL 로 바꾼다.
import { clearSession, getSession } from "./auth";
import { markSlow, toast } from "./notify";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const SLOW_MS = 3000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// 서버가 보낸 오류 문구(NestJS 형식: message 가 문자열 또는 배열)를 사람이 읽을 문장으로 꺼낸다.
async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message[0] ?? res.statusText;
    if (body.message) return body.message;
  } catch {}
  return `${res.status} ${res.statusText}`;
}

/**
 * - 직원 로그인 상태면 Authorization 헤더를 자동으로 붙인다.
 * - 3초 넘게 걸리면 화면 위에 "연결이 느려요"를 띄운다.
 * - 서버에 닿지 못하면 토스트로 알리고 ApiError(0)을 던진다.
 * - 서버 오류(4xx·5xx)는 ApiError(status, 서버 문구)를 던진다. 화면에서 토스트로 보여 준다.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  let slow = false;
  const timer = setTimeout(() => {
    slow = true;
    markSlow(1);
  }, SLOW_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    toast("서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.", "error");
    throw new ApiError(0, "서버에 연결할 수 없어요.");
  } finally {
    clearTimeout(timer);
    if (slow) markSlow(-1);
  }

  if (res.status === 401 && session) {
    // 로그인 만료·로그아웃된 토큰: 저장된 로그인 정보를 지우고 로그인 화면으로 보낸다.
    clearSession();
    toast("다시 로그인해 주세요", "error");
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/staff")) {
      window.location.assign("/staff/login");
    }
  }
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// 사용 예: api<Item[]>("/items"), api<Item>("/items", { method: "POST", body: JSON.stringify(data) })
