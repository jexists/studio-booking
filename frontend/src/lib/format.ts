// 날짜·시간 표기 (한국 시간 기준)
const tz = { timeZone: "Asia/Seoul" } as const;

export function fmtDay(d: string | Date) {
  return new Intl.DateTimeFormat("ko-KR", { ...tz, month: "numeric", day: "numeric", weekday: "short" }).format(new Date(d));
}

export function fmtTime(d: string | Date) {
  return new Intl.DateTimeFormat("ko-KR", { ...tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(d));
}

export function fmtDate(d: string | Date) {
  return new Intl.DateTimeFormat("ko-KR", { ...tz, month: "numeric", day: "numeric" }).format(new Date(d));
}

// 같은 날짜끼리 묶기용 키
export function dayKey(d: string | Date) {
  return new Intl.DateTimeFormat("en-CA", tz).format(new Date(d));
}

// 숫자만 입력해도 010-1234-5678 형태로 보이게 맞춘다
export function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
