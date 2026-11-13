"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageTitle, Skeleton } from "@/components/ui/PageTitle";
import { ReservationSearch } from "@/features/schedule/ReservationSearch";
import { CreateSessionSheet } from "@/features/schedule/CreateSessionSheet";
import { addDays, KIND_LABEL, mondayOf, PROGRAM_LABEL, sessionName, toastError, type SessionRow } from "@/features/schedule/types";
import { api } from "@/lib/api";
import { dayKey, fmtDate, fmtDay, fmtTime } from "@/lib/format";

// STF-04 클래스 일정 (주 단위)
export default function StaffClassesPage() {
  const thisWeek = useMemo(() => mondayOf(dayKey(new Date())), []);
  const [week, setWeek] = useState(thisWeek);
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setSessions(null);
    api<{ weekStart: string; sessions: SessionRow[] }>(`/staff/classes?weekStart=${week}`)
      .then((r) => setSessions(r.sessions))
      .catch((e) => {
        toastError(e);
        setSessions([]);
      });
  }, [week]);
  useEffect(load, [load]);

  const days = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const s of sessions ?? []) {
      const k = dayKey(s.startsAt);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [sessions]);

  const weekEnd = addDays(week, 6);

  return (
    <>
      <PageTitle action={<Button size="sm" onClick={() => setAdding(true)}>일정 추가</Button>}>일정</PageTitle>

      <ReservationSearch />

      <div className="mb-5 flex items-center justify-between gap-2">
        <Button size="sm" variant="secondary" aria-label="지난주" onClick={() => setWeek(addDays(week, -7))}>
          ◀
        </Button>
        <div className="flex flex-col items-center">
          <span className="tabular text-base font-semibold">
            {fmtDate(`${week}T12:00:00+09:00`)} – {fmtDate(`${weekEnd}T12:00:00+09:00`)}
          </span>
          {week !== thisWeek && (
            <button type="button" className="text-sm font-semibold text-primary underline underline-offset-4" onClick={() => setWeek(thisWeek)}>
              이번 주
            </button>
          )}
        </div>
        <Button size="sm" variant="secondary" aria-label="다음 주" onClick={() => setWeek(addDays(week, 7))}>
          ▶
        </Button>
      </div>

      {!sessions ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState title="이번 주에 잡힌 수업이 없어요" action={<Button size="sm" variant="secondary" onClick={() => setAdding(true)}>일정 추가</Button>} />
      ) : (
        <div className="flex flex-col gap-5">
          {days.map(([key, list]) => (
            <section key={key}>
              <h2 className="mb-2 text-sm font-semibold text-muted">{fmtDay(list[0].startsAt)}</h2>
              <div className="overflow-hidden rounded-lg border border-line bg-surface">
                <ul>
                  {list.map((s) => {
                    const full = s.used >= s.capacity;
                    return (
                      <li key={s.id} className="border-b border-line last:border-0">
                        <Link href={`/staff/classes/${s.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-primary-subtle">
                          <span className="tabular w-12 shrink-0 text-sm font-semibold">{fmtTime(s.startsAt)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <Badge tone={s.program === "ONEDAY" ? "accent" : "primary"}>{PROGRAM_LABEL[s.program]}</Badge>
                              <Badge>{KIND_LABEL[s.kind]}</Badge>
                              {s.cancelled && <Badge tone="error">휴강</Badge>}
                            </span>
                            <span className={`mt-1 block truncate ${s.cancelled ? "text-muted line-through" : ""}`}>{sessionName(s)}</span>
                          </span>
                          <span className={`tabular shrink-0 text-sm font-semibold ${full ? "text-warning" : ""}`}>
                            {s.used}/{s.capacity}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}

      <CreateSessionSheet open={adding} onClose={() => setAdding(false)} onCreated={load} />
    </>
  );
}
