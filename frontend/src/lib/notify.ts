// React 밖(lib/api.ts 등)에서도 토스트·느린 연결 알림을 띄우기 위한 작은 이벤트 버스.
export type ToastTone = "info" | "success" | "error";
export type ToastMessage = { id: number; text: string; tone: ToastTone };

const TOAST_EVENT = "hf:toast";
const SLOW_EVENT = "hf:slow";
let seq = 0;
let pendingSlow = 0;

export function toast(text: string, tone: ToastTone = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT, { detail: { id: ++seq, text, tone } }));
}

export function onToast(handler: (m: ToastMessage) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<ToastMessage>).detail);
  window.addEventListener(TOAST_EVENT, listener);
  return () => window.removeEventListener(TOAST_EVENT, listener);
}

// 3초 넘게 걸리는 요청 수. 0보다 크면 "연결이 느려요" 표시.
export function markSlow(delta: 1 | -1) {
  if (typeof window === "undefined") return;
  pendingSlow = Math.max(0, pendingSlow + delta);
  window.dispatchEvent(new CustomEvent<number>(SLOW_EVENT, { detail: pendingSlow }));
}

export function onSlow(handler: (count: number) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<number>).detail);
  window.addEventListener(SLOW_EVENT, listener);
  return () => window.removeEventListener(SLOW_EVENT, listener);
}
