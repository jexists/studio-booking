// 보강 신청 상태 → 화면 문구 (배지 색은 components/ui/Badge 의 statusTone)
export type MakeupStatus = "REQUESTED" | "APPROVED" | "REJECTED";
export const MAKEUP_LABEL: Record<MakeupStatus, string> = { REQUESTED: "대기", APPROVED: "승인", REJECTED: "반려" };
