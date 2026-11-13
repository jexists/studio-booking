"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { api, ApiError } from "@/lib/api";
import { fmtDay, fmtTime } from "@/lib/format";
import { toast } from "@/lib/notify";
import { MAKEUP_LABEL, type MakeupStatus } from "./status";


type Candidate = { id: number; courseName: string; startsAt: string; endsAt: string; capacity: number; used: number; remaining: number };
type MySession = { id: number; weekNo: number | null; startsAt: string; endsAt: string; requestStatus: MakeupStatus | null; candidates: Candidate[] };
type MyRequest = {
  id: number;
  status: MakeupStatus;
  rejectReason: string | null;
  missed: { id: number; courseName: string; startsAt: string };
  target: { id: number; courseName: string; startsAt: string };
};
type Options = { courseName: string; sessions: MySession[]; requests: MyRequest[] };

const when = (iso: string) => `${fmtDay(iso)} ${fmtTime(iso)}`;

// PUB-05 정규반 보강 신청: 내 보강 신청 상태 + [보강 신청] 버튼과 하단 시트
export function MakeupSection({ reservationNo, phoneLast4 }: { reservationNo: string; phoneLast4: string }) {
  const [data, setData] = useState<Options | null>(null);
  const [open, setOpen] = useState(false);
  const [missedId, setMissedId] = useState("");
  const [targetId, setTargetId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<Options>("/me/makeups/options", { method: "POST", body: JSON.stringify({ reservationNo, phoneLast4 }) })
      .then(setData)
      .catch(() => setData(null));
  }, [reservationNo, phoneLast4]);
  useEffect(load, [load]);

  if (!data) return null;
  const selectable = data.sessions.filter((s) => !s.requestStatus);
  if (selectable.length === 0 && data.requests.length === 0) return null;
  const missed = data.sessions.find((s) => String(s.id) === missedId);

  const close = () => {
    setOpen(false);
    setMissedId("");
    setTargetId(null);
  };

  const submit = async () => {
    if (!missed) return toast("빠지는 회차를 골라 주세요", "error");
    if (!targetId) return toast("보강 받을 반을 골라 주세요", "error");
    setSaving(true);
    try {
      await api("/me/makeups", {
        method: "POST",
        body: JSON.stringify({ reservationNo, phoneLast4, missedSessionId: missed.id, targetSessionId: targetId }),
      });
      toast("강사 확인 후 안내드려요", "success");
      close();
      load();
    } catch (e) {
      if (e instanceof ApiError && e.status !== 0) toast(e.message, "error");
      if (e instanceof ApiError && e.status === 409) {
        setTargetId(null);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">보강</h2>
        {selectable.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            보강 신청
          </Button>
        )}
      </div>

      {data.requests.length > 0 && (
        <Card className="p-0 sm:p-0">
          <ul>
            {data.requests.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 last:border-0">
                <div className="min-w-0 text-sm">
                  <p className="tabular">
                    <span className="text-muted">빠지는 날</span> {when(r.missed.startsAt)}
                  </p>
                  <p className="tabular">
                    <span className="text-muted">보강</span> {r.target.courseName} {when(r.target.startsAt)}
                  </p>
                  {r.status === "REJECTED" && r.rejectReason && <p className="mt-1 text-error">{r.rejectReason}</p>}
                </div>
                <Badge tone={statusTone[MAKEUP_LABEL[r.status]]}>{MAKEUP_LABEL[r.status]}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Sheet
        open={open}
        onClose={close}
        title="보강 신청"
        footer={
          <Button full loading={saving} onClick={submit}>
            보강 신청
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          <Field label="빠지는 회차" required>
            {(id) => (
              <Select
                id={id}
                value={missedId}
                onChange={(e) => {
                  setMissedId(e.target.value);
                  setTargetId(null);
                }}
              >
                <option value="">회차를 골라 주세요</option>
                {selectable.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.weekNo ? `${s.weekNo}회차 · ` : ""}
                    {when(s.startsAt)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {missed && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-ink">
                보강 받을 반<span className="ml-0.5 text-error" aria-hidden>*</span>
              </p>
              {missed.candidates.length === 0 ? (
                <p className="rounded-md border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                  이번 주에는 보강 가능한 반이 없어요. 공방에 문의해 주세요.
                </p>
              ) : (
                <div role="radiogroup" aria-label="보강 받을 반" className="flex flex-col gap-2">
                  {missed.candidates.map((c) => {
                    const on = targetId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setTargetId(c.id)}
                        className={`flex min-h-16 items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition-colors ${on ? "border-primary bg-primary-subtle" : "border-line bg-surface hover:border-primary"}`}
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold">{c.courseName}</span>
                          <span className="tabular block text-sm text-muted">
                            {when(c.startsAt)} ~ {fmtTime(c.endsAt)}
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-sm text-primary">남은 자리 {c.remaining}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Sheet>
    </section>
  );
}
