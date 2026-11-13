// 직원 로그인 상태(토큰·이름·역할)를 브라우저에 보관한다. 수강생은 로그인하지 않는다.
export type StaffRole = "OWNER" | "STAFF";
export type StaffSession = { token: string; name: string; email: string; role: StaffRole };

const KEY = "hf_staff";
const EVENT = "hf:auth";

export function getSession(): StaffSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StaffSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: StaffSession) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // 저장소를 쓸 수 없는 환경(사파리 비공개 등)은 이번 탭에서만 유지되지 않는다.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clearSession() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function onAuthChange(handler: () => void) {
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
