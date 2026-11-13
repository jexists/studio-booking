// 수강생 조회 상태는 직원 로그인과 분리한다. 예약 번호와 휴대폰 뒤 4자리로
// 조회를 마친 현재 브라우저 탭에서만 유지한다.
export type MemberSession = { name: string; reservationNo: string; phoneLast4: string };

const KEY = "hf_member";
const EVENT = "hf:member-auth";

export function getMemberSession(): MemberSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MemberSession) : null;
  } catch {
    return null;
  }
}

export function saveMemberSession(session: MemberSession) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function clearMemberSession() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function onMemberAuthChange(handler: () => void) {
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
