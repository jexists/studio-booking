"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { fmtDay, fmtTime } from "@/lib/format";
import { CHANNEL_LABEL, PROGRAM_LABEL, STATUS_LABEL, type Program, type ResStatus } from "./types";

type Hit = {
  id: number;
  reservationNo: string;
  name: string;
  phone: string;
  headcount: number;
  channel: keyof typeof CHANNEL_LABEL;
  status: ResStatus;
  program: Program;
  title: string;
  sessionId: number | null;
  startsAt: string | null;
};

const TONE = { PENDING: "warning", CONFIRMED: "success", CANCELLED: "neutral", NO_SHOW: "error" } as const;

// 예약번호·전화번호(일부 가능)·이름으로 신청 내역을 바로 찾는다.
export function ReservationSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const term = q.trim();

  useEffect(() => {
    if (term.length < 2) {
      setHits(null);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      api<{ results: Hit[] }>(`/staff/reservations/search?q=${encodeURIComponent(term)}`)
        .then((r) => live && setHits(r.results))
        .catch(() => live && setHits([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [term]);

  return (
    <div className="mb-5">
      <Input
        type="search"
        placeholder="예약번호·전화번호·이름으로 찾기"
        aria-label="예약 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
      />
      {hits && (
        <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
          {hits.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted">찾는 신청이 없어요</p>
          ) : (
            <ul>
              {hits.map((h) => {
                const body = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold">{h.name}</span>
                        <Badge tone={TONE[h.status]}>{STATUS_LABEL[h.status]}</Badge>
                        <Badge>{PROGRAM_LABEL[h.program]}</Badge>
                      </span>
                      <span className="tabular mt-1 block text-sm text-muted">
                        {h.reservationNo} · {h.phone} · {h.headcount}명 · {CHANNEL_LABEL[h.channel]}
                      </span>
                      <span className="mt-0.5 block truncate text-sm">
                        {h.title}
                        {h.startsAt && h.program === "ONEDAY" ? ` · ${fmtDay(h.startsAt)} ${fmtTime(h.startsAt)}` : ""}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={h.id} className="border-b border-line last:border-0">
                    {h.sessionId ? (
                      <Link href={`/staff/classes/${h.sessionId}`} className="flex px-4 py-3 hover:bg-primary-subtle">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex px-4 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
