"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, PageTitle, Skeleton } from "@/components/ui/PageTitle";
import { api } from "@/lib/api";
import { fmtDay, fmtTime } from "@/lib/format";

type TodaySession = {
  id: number;
  title: string;
  program: "ONEDAY" | "REGULAR";
  kind: "HAND" | "WHEEL";
  courseName: string | null;
  weekNo: number | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  used: number;
  cancelled: boolean;
};
type Dashboard = {
  today: TodaySession[];
  pendingReservations: number;
  makeupsRequested: number;
  newInquiries: number;
  kiln: { min: number; bisqueWaiting: number; glazeWaiting: number };
  overdueWorks: number;
  noShowsToday: number;
  cancelRequests: {
    id: number;
    reservationNo: string;
    name: string;
    headcount: number;
    sessionId: number | null;
    title: string;
    startsAt: string | null;
    cancelRequestedAt: string;
    cancelRequestRate: number;
    cancelReason: string | null;
  }[];
};

function StatCard({ href, label, value, unit, ready, alert }: { href: string; label: string; value: number; unit?: string; ready?: boolean; alert?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-start gap-1 rounded-lg border bg-surface p-4 transition-colors hover:border-primary ${ready ? "border-success" : "border-line"}`}
    >
      <span className="text-sm text-muted">{label}</span>
      <span className={`tabular text-lg font-semibold ${alert && value > 0 ? "text-primary" : "text-ink"}`}>
        {value}
        {unit && <span className="text-sm font-normal text-muted"> {unit}</span>}
      </span>
      {ready && <Badge tone="success">가마 가동 가능</Badge>}
    </Link>
  );
}

// STF-03 오늘
export default function StaffHomePage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<Dashboard>("/staff/dashboard").then(setData).catch(() => setFailed(true));
  }, []);

  return (
    <>
      <PageTitle>오늘</PageTitle>

      {!data ? (
        failed ? (
          <EmptyState title="불러오지 못했어요. 잠시 후 다시 열어 주세요" />
        ) : (
          <>
            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="mb-3 h-6 w-24" />
            <Skeleton className="h-20" />
          </>
        )
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatCard href="/staff/classes" label="확정 안 된 신청" value={data.pendingReservations} unit="건" alert />
            <StatCard href="/staff/makeups" label="보강 대기" value={data.makeupsRequested} unit="건" alert />
            <StatCard href="/staff/inquiries" label="새 단체 문의" value={data.newInquiries} unit="건" alert />
            <StatCard
              href="/staff/works"
              label="초벌 대기"
              value={data.kiln.bisqueWaiting}
              unit={`/ ${data.kiln.min}점`}
              ready={data.kiln.bisqueWaiting >= data.kiln.min}
            />
            <StatCard
              href="/staff/works"
              label="재벌 대기"
              value={data.kiln.glazeWaiting}
              unit={`/ ${data.kiln.min}점`}
              ready={data.kiln.glazeWaiting >= data.kiln.min}
            />
            <StatCard href="/staff/works" label="보관 기한 지남" value={data.overdueWorks} unit="점" alert />
            <StatCard href="#cancel-requests" label="환불 요청" value={data.cancelRequests.length} unit="건" alert />
            <StatCard href="/staff/classes" label="오늘 노쇼" value={data.noShowsToday} unit="명" />
          </div>

          {data.cancelRequests.length > 0 && (
            <section id="cancel-requests" className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-ink">환불 요청</h2>
              <ul className="flex flex-col gap-3">
                {data.cancelRequests.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={r.sessionId ? `/staff/classes/${r.sessionId}` : "/staff/classes"}
                      className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-primary"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-base font-semibold text-ink">
                          {r.name} · {r.headcount}명
                        </span>
                        <span className="tabular truncate text-sm text-muted">
                          {r.title}
                          {r.startsAt ? ` · ${fmtDay(r.startsAt)} ${fmtTime(r.startsAt)}` : ""}
                          {r.cancelReason ? ` · ${r.cancelReason}` : ""}
                        </span>
                      </span>
                      <Badge tone="warning">환불 {r.cancelRequestRate}%</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <h2 className="mb-3 text-lg font-semibold text-ink">오늘 수업</h2>
          {data.today.length === 0 ? (
            <EmptyState title="오늘은 수업이 없어요" />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.today.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/staff/classes/${s.id}`}
                    className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-primary"
                  >
                    <span className="tabular w-14 shrink-0 text-base font-semibold text-ink">{fmtTime(s.startsAt)}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-base font-semibold text-ink">
                        {s.program === "REGULAR" && s.courseName ? s.courseName : s.title}
                      </span>
                      <span className="text-sm text-muted">
                        {s.program === "REGULAR" && s.weekNo ? `${s.weekNo}주차 · ` : ""}
                        {fmtTime(s.startsAt)}–{fmtTime(s.endsAt)}
                      </span>
                    </span>
                    {s.cancelled ? (
                      <Badge>휴강</Badge>
                    ) : (
                      <span className="tabular shrink-0 text-base font-semibold text-ink">
                        {s.used}
                        <span className="text-sm font-normal text-muted"> / {s.capacity}명</span>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
