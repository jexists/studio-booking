import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "error" | "primary";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-muted",
  accent: "bg-accent-subtle text-accent",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  error: "bg-error-subtle text-error",
  primary: "bg-primary-subtle text-primary",
};

// 상태 배지. 모서리 2px, 점 없이 글자로 상태를 전한다. 공개·직원 화면 공통.
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-badge px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

// 자주 쓰는 상태 → 배지 색. 화면마다 색이 달라지지 않게 여기서만 정한다.
export const statusTone: Record<string, BadgeTone> = {
  예약가능: "accent",
  마감: "neutral",
  신청: "warning",
  확정: "success",
  취소: "neutral",
  대기: "warning",
  승인: "success",
  반려: "error",
  파손: "error",
  "처리 중": "neutral",
  "검색 가능": "success",
  실패: "error",
};
