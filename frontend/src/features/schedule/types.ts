import type { StageKey } from "@/components/ui/StageBar";
import { ApiError } from "@/lib/api";
import { toast } from "@/lib/notify";

export type Program = "ONEDAY" | "REGULAR";
export type Kind = "HAND" | "WHEEL";
export type ResStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export type SessionRow = {
  id: number;
  program: Program;
  kind: Kind;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  used: number;
  cancelled: boolean;
  courseName: string | null;
  weekNo: number | null;
};

export type RosterItem = {
  id: number;
  reservationNo: string;
  name: string;
  phone: string;
  phoneLast4: string;
  headcount: number;
  channel: "WEB" | "DM" | "NAVER";
  status: ResStatus;
  refundRate: number | null;
  memo: string | null;
  flag: "MAKEUP_IN" | "MOVED_OUT" | null;
  worksCount: number;
};

export type SessionDetail = SessionRow & {
  roster: RosterItem[];
  works: { id: number; workNo: string; ownerName: string; itemName: string; stage: StageKey }[];
};

export const PROGRAM_LABEL: Record<Program, string> = { ONEDAY: "원데이", REGULAR: "정규반" };
export const KIND_LABEL: Record<Kind, string> = { HAND: "일반", WHEEL: "물레" };
export const CAPACITY: Record<Kind, number> = { HAND: 8, WHEEL: 6 };
export const STATUS_LABEL: Record<ResStatus, string> = { PENDING: "신청", CONFIRMED: "확정", CANCELLED: "취소" };
export const CHANNEL_LABEL = { WEB: "웹", DM: "DM", NAVER: "네이버" } as const;

export function sessionName(s: Pick<SessionRow, "program" | "title" | "courseName" | "weekNo">) {
  return s.program === "REGULAR" && s.courseName ? `${s.courseName} ${s.weekNo ?? ""}주차`.trim() : s.title;
}

// api() 가 이미 토스트를 띄운 연결 오류(0)는 건너뛴다.
export function toastError(e: unknown) {
  if (e instanceof ApiError && e.status !== 0) toast(e.message, "error");
}

// 한국 시간 기준 YYYY-MM-DD 날짜 계산
export function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  return new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10);
}
export function mondayOf(ymd: string) {
  const d = new Date(`${ymd}T00:00:00Z`);
  return addDays(ymd, -((d.getUTCDay() + 6) % 7));
}
