"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Overlay";
import { EmptyState, PageTitle, Skeleton } from "@/components/ui/PageTitle";
import { MAKEUP_LABEL, type MakeupStatus } from "@/features/makeup/status";
import { api, ApiError } from "@/lib/api";
import { fmtDate, fmtDay, fmtTime } from "@/lib/format";
import { toast } from "@/lib/notify";

type Makeup = {
  id: number;
  status: MakeupStatus;
  rejectReason: string | null;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  student: { name: string; reservationNo: string; phoneLast4: string; headcount: number };
  missed: { id: number; courseName: string; startsAt: string };
  target: { id: number; courseName: string; startsAt: string; capacity: number; used: number };
};
type Tab = "REQUESTED" | "DECIDED";
const TABS: { key: Tab; label: string }[] = [
  { key: "REQUESTED", label: "대기" },
  { key: "DECIDED", label: "처리됨" },
];

const when = (iso: string) => `${fmtDay(iso)} ${fmtTime(iso)}`;

// STF-07 보강 신청 승인·반려
export default function MakeupsPage() {
  const [tab, setTab] = useState<Tab>("REQUESTED");
  const [items, setItems] = useState<Makeup[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<Makeup | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    api<Makeup[]>(`/staff/makeups?status=${tab}`)
      .then(setItems)
      .catch(() => setItems([]));
  }, [tab]);
  useEffect(() => {
    setItems(null);
    load();
  }, [load]);

  const approve = async (m: Makeup) => {
    setBusyId(m.id);
    try {
      await api(`/staff/makeups/${m.id}/approve`, { method: "PATCH" });
      toast(`${m.student.name} 님 보강을 승인했어요`, "success");
    } catch (e) {
      if (e instanceof ApiError && e.status !== 0) toast(e.message, "error");
    } finally {
      setBusyId(null);
      load();
    }
  };

  const closeReject = () => {
    setRejecting(null);
    setReason("");
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    try {
      await api(`/staff/makeups/${rejecting.id}/reject`, { method: "PATCH", body: JSON.stringify({ reason: reason.trim() || undefined }) });
      toast(`${rejecting.student.name} 님 보강을 반려했어요`, "success");
      closeReject();
    } catch (e) {
      if (e instanceof ApiError && e.status !== 0) toast(e.message, "error");
    } finally {
      setBusyId(null);
      load();
    }
  };

  return (
    <>
      <PageTitle>보강</PageTitle>

      <div className="mb-4 flex gap-2" role="tablist" aria-label="보강 신청 상태">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap ${tab === t.key ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary"}`}
          >
            {t.label}
            {t.key === tab && items ? <span className="tabular ml-1 opacity-80">{items.length}</span> : null}
          </button>
        ))}
      </div>

      {!items ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={tab === "REQUESTED" ? "확인할 보강 신청이 없어요" : "처리한 보강 신청이 없어요"} />
      ) : (
        <Card className="p-0 sm:p-0">
          <ul>
            {items.map((m) => {
              const full = m.target.used + m.student.headcount > m.target.capacity;
              return (
                <li key={m.id} className="flex flex-col gap-3 border-b border-line px-5 py-4 last:border-0 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{m.student.name}</span>
                      <span className="tabular text-sm text-muted">
                        {m.student.reservationNo} · {m.student.phoneLast4}
                      </span>
                      {m.status !== "REQUESTED" && <Badge tone={statusTone[MAKEUP_LABEL[m.status]]}>{MAKEUP_LABEL[m.status]}</Badge>}
                    </div>
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                      <dt className="text-muted">빠지는 반</dt>
                      <dd className="tabular">
                        {m.missed.courseName} · {when(m.missed.startsAt)}
                      </dd>
                      <dt className="text-muted">보강 반</dt>
                      <dd className="tabular">
                        {m.target.courseName} · {when(m.target.startsAt)}
                        <span className={`ml-2 font-semibold ${full && m.status === "REQUESTED" ? "text-error" : "text-primary"}`}>
                          {m.target.used}/{m.target.capacity}명
                        </span>
                      </dd>
                      {m.status !== "REQUESTED" && m.decidedAt && (
                        <>
                          <dt className="text-muted">처리</dt>
                          <dd className="tabular">
                            {fmtDate(m.decidedAt)}
                            {m.decidedBy ? ` · ${m.decidedBy}` : ""}
                          </dd>
                        </>
                      )}
                      {m.rejectReason && (
                        <>
                          <dt className="text-muted">사유</dt>
                          <dd>{m.rejectReason}</dd>
                        </>
                      )}
                    </dl>
                  </div>
                  {m.status === "REQUESTED" && (
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="destructive" disabled={busyId !== null} onClick={() => setRejecting(m)}>
                        반려
                      </Button>
                      <Button size="sm" loading={busyId === m.id} disabled={busyId !== null} onClick={() => approve(m)}>
                        승인
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Modal
        open={!!rejecting}
        onClose={closeReject}
        title="보강 반려"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeReject}>
              그대로 두기
            </Button>
            <Button variant="destructive" size="sm" loading={busyId === rejecting?.id} onClick={reject}>
              반려
            </Button>
          </>
        }
      >
        <Field label="사유">
          {(id) => <Textarea id={id} rows={3} maxLength={200} placeholder="예: 화요일 반 자리가 다 찼어요" value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </Modal>
    </>
  );
}
