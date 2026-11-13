import Link from "next/link";
import type { ReactNode } from "react";

// 페이지 제목 28px. 아래 설명 문구는 두지 않는다. 오른쪽에 버튼 등을 둘 수 있다.
export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-title font-semibold tracking-tight text-ink">{children}</h1>
      {action}
    </div>
  );
}

// "< 대시보드" 형식의 돌아가기 링크.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
      <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="text-base text-muted">{title}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-muted ${className}`} aria-hidden />;
}
