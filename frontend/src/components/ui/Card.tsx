import type { HTMLAttributes, ReactNode } from "react";

// 흰 바탕 + 테두리 카드. 그림자는 쓰지 않는다.
export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  // className 에 p-0 이 있으면 기본 안쪽 여백을 빼서(목록용) 두 패딩이 충돌하지 않게 한다.
  const pad = /\bp-0\b/.test(className) ? "" : "p-5 sm:p-6";
  return <div {...rest} className={`rounded-lg border border-line bg-surface ${pad} ${className}`} />;
}

// 주의 안내(변경·취소·식기 사용). 색과 아이콘을 함께 쓴다.
export function Notice({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "error" }) {
  const color = tone === "error" ? "bg-error-subtle text-error" : "bg-warning-subtle text-warning";
  return (
    <div role="note" className={`flex gap-2 rounded-md px-4 py-3 text-sm ${color}`}>
      <svg className="mt-0.5 size-4 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M8 1.8l6.6 11.6H1.4L8 1.8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M8 6.2v3.2M8 11.4v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <div>{children}</div>
    </div>
  );
}
