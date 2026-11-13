"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BackLink, EmptyState, Skeleton } from "@/components/ui/PageTitle";
import { stageLabel } from "@/components/ui/StageBar";
import { CancelModal, EditSessionSheet, ReservationSheet, WorksSheet } from "@/features/schedule/SessionSheets";
import {
  CHANNEL_LABEL,
  KIND_LABEL,
  PROGRAM_LABEL,
  sessionName,
  STATUS_LABEL,
  toastError,
  type RosterItem,
  type SessionDetail,
} from "@/features/schedule/types";
import { api } from "@/lib/api";
import { fmtDay, fmtTime } from "@/lib/format";
import { toast } from "@/lib/notify";

// STF-05 일정 상세·명단
export default function StaffClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [s, setS] = useState<SessionDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [sheet, setSheet] = useState<"reserve" | "works" | "edit" | null>(null);
  const [cancelTarget, setCancelTarget] = useState<RosterItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    api<SessionDetail>(`/staff/classes/${id}`)
      .then(setS)
      .catch((e) => {
        toastError(e);
        setMissing(true);
      });
  }, [id]);
  useEffect(load, [load]);

  const confirm = async (r: RosterItem) => {
    setBusyId(r.id);
    try {
      await api(`/staff/reservations/${r.id}/confirm`, { method: "PATCH" });
      toast(`${r.name} 님 예약을 확정했어요`, "success");
      load();
    } catch (e) {
      toastError(e);
    } finally {
      setBusyId(null);
    }
  };

  if (!s) {
    return (
      <>
        <BackLink href="/staff/classes" label="일정" />
        {missing ? (
          <EmptyState title="일정을 찾을 수 없어요" />
        ) : (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-48" />
          </div>
        )}
      </>
    );
  }

  const oneday = s.program === "ONEDAY";

  return (
    <>
      <BackLink href="/staff/classes" label="일정" />

      <Card className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={oneday ? "accent" : "primary"}>{PROGRAM_LABEL[s.program]}</Badge>
              <Badge>{KIND_LABEL[s.kind]}</Badge>
              {s.cancelled && <Badge tone="error">휴강</Badge>}
            </div>
            <h1 className="text-lg font-semibold">{sessionName(s)}</h1>
            <p className="tabular mt-1 text-base">
              {fmtDay(s.startsAt)} {fmtTime(s.startsAt)}–{fmtTime(s.endsAt)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className={`tabular text-lg font-semibold ${s.used >= s.capacity ? "text-warning" : ""}`}>
              {s.used}/{s.capacity}
            </span>
            <Button size="sm" variant="tertiary" onClick={() => setSheet("edit")}>
              수정
            </Button>
          </div>
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">명단</h2>
        {oneday && (
          <Button size="sm" variant="secondary" disabled={s.cancelled} onClick={() => setSheet("reserve")}>
            DM·네이버 예약 등록
          </Button>
        )}
      </div>

      {s.roster.length === 0 ? (
        <EmptyState title="아직 예약이 없어요" />
      ) : (
        <div className="mb-6 overflow-hidden rounded-lg border border-line bg-surface">
          <ul>
            {s.roster.map((r) => {
              const label = STATUS_LABEL[r.status];
              return (
                <li key={`${r.id}-${r.flag ?? ""}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`font-semibold ${r.status === "CANCELLED" || r.flag === "MOVED_OUT" ? "text-muted" : ""}`}>{r.name}</span>
                      <Badge tone={statusTone[label]}>
                        {label}
                        {r.status === "CANCELLED" && r.refundRate ? ` (${r.refundRate === 100 ? "전액" : "50%"})` : ""}
                      </Badge>
                      {r.flag === "MAKEUP_IN" && <Badge tone="accent">보강</Badge>}
                      {r.flag === "MOVED_OUT" && <Badge>보강 감</Badge>}
                    </div>
                    <p className="tabular mt-1 text-sm text-muted">
                      {r.reservationNo} · {r.headcount}명 · {CHANNEL_LABEL[r.channel]} · {r.phone}
                      {r.worksCount > 0 ? ` · 작품 ${r.worksCount}점` : ""}
                    </p>
                    {r.memo && <p className="mt-1 text-sm">{r.memo}</p>}
                  </div>
                  {r.status !== "CANCELLED" && r.flag !== "MAKEUP_IN" && (
                    <div className="flex gap-2">
                      {r.status === "PENDING" && (
                        <Button size="sm" loading={busyId === r.id} onClick={() => confirm(r)}>
                          확정
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" disabled={busyId === r.id} onClick={() => setCancelTarget(r)}>
                        취소
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-6 mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          작품 <span className="tabular text-base font-normal text-muted">{s.works.length}점</span>
        </h2>
        <Button size="sm" variant="secondary" onClick={() => setSheet("works")}>
          작품 등록
        </Button>
      </div>
      {s.works.length === 0 ? (
        <EmptyState title="등록한 작품이 없어요" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <ul>
            {s.works.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
                <span className="min-w-0">
                  <span className="font-semibold">{w.itemName}</span>
                  <span className="tabular ml-2 text-sm text-muted">{w.workNo}</span>
                  <span className="block truncate text-sm text-muted">{w.ownerName}</span>
                </span>
                <Badge tone="primary">{stageLabel(w.stage)}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {oneday && <ReservationSheet open={sheet === "reserve"} onClose={() => setSheet(null)} session={s} onDone={load} />}
      <WorksSheet open={sheet === "works"} onClose={() => setSheet(null)} session={s} onDone={load} />
      <EditSessionSheet open={sheet === "edit"} onClose={() => setSheet(null)} session={s} onDone={load} />
      <CancelModal target={cancelTarget} onClose={() => setCancelTarget(null)} onDone={load} />
    </>
  );
}
