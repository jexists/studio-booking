"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal, Sheet } from "@/components/ui/Overlay";
import { api, ApiError } from "@/lib/api";
import { fmtDay, fmtTime, formatPhone } from "@/lib/format";
import { toast } from "@/lib/notify";
import { CHANNEL_LABEL, toastError, type RosterItem, type SessionDetail } from "./types";

const DUP_MESSAGE = "같은 번호로 이미 예약이 있어요";

type SheetProps = { open: boolean; onClose: () => void; session: SessionDetail; onDone: () => void };

// DM·네이버 예약 대리 등록 (원데이만). 같은 번호가 있으면 확인 후 다시 보낸다.
export function ReservationSheet({ open, onClose, session, onDone }: SheetProps) {
  const empty = { name: "", phone: "", headcount: "1", channel: "DM", status: "CONFIRMED" };
  const [f, setF] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [dupAsk, setDupAsk] = useState(false);
  const set = (p: Partial<typeof empty>) => setF((prev) => ({ ...prev, ...p }));

  const close = () => {
    setF(empty);
    setDupAsk(false);
    onClose();
  };

  const send = async (force: boolean) => {
    if (!f.name.trim()) return toast("이름을 입력해 주세요", "error");
    if (!/^010-\d{4}-\d{4}$/.test(f.phone)) return toast("휴대폰 번호를 010-1234-5678 형식으로 입력해 주세요", "error");
    setSaving(true);
    try {
      const r = await api<{ reservationNo: string }>(`/staff/classes/${session.id}/reservations`, {
        method: "POST",
        body: JSON.stringify({ name: f.name.trim(), phone: f.phone, headcount: Number(f.headcount), channel: f.channel, status: f.status, force }),
      });
      toast(`예약을 등록했어요 (${r.reservationNo})`, "success");
      onDone();
      close();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.message === DUP_MESSAGE) setDupAsk(true);
      else toastError(e);
    } finally {
      setSaving(false);
    }
  };

  const remaining = Math.max(0, session.capacity - session.used);

  return (
    <>
      <Sheet
        open={open && !dupAsk}
        onClose={close}
        title="DM·네이버 예약 등록"
        footer={
          <Button full loading={saving} onClick={() => send(false)}>
            등록하기
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          <p className="tabular text-sm font-semibold">남은 자리 {remaining}자리</p>
          <Field label="이름" required>
            {(id) => <Input id={id} value={f.name} maxLength={20} placeholder="홍길동" onChange={(e) => set({ name: e.target.value })} />}
          </Field>
          <Field label="휴대폰" required>
            {(id) => <Input id={id} inputMode="numeric" className="tabular" value={f.phone} placeholder="010-1234-5678" onChange={(e) => set({ phone: formatPhone(e.target.value) })} />}
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="인원" required>
              {(id) => (
                <Select id={id} value={f.headcount} onChange={(e) => set({ headcount: e.target.value })}>
                  {Array.from({ length: Math.max(1, Math.min(8, session.capacity)) }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}명
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="경로" required>
              {(id) => (
                <Select id={id} value={f.channel} onChange={(e) => set({ channel: e.target.value })}>
                  <option value="DM">DM</option>
                  <option value="NAVER">네이버</option>
                </Select>
              )}
            </Field>
            <Field label="상태" required>
              {(id) => (
                <Select id={id} value={f.status} onChange={(e) => set({ status: e.target.value })}>
                  <option value="CONFIRMED">확정</option>
                  <option value="PENDING">신청</option>
                </Select>
              )}
            </Field>
          </div>
        </div>
      </Sheet>
      <Modal
        open={open && dupAsk}
        onClose={() => setDupAsk(false)}
        title="중복 예약 같아요"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDupAsk(false)}>
              돌아가기
            </Button>
            <Button size="sm" loading={saving} onClick={() => send(true)}>
              그래도 등록
            </Button>
          </>
        }
      >
        <p>
          {f.phone} 번호로 이 수업에 이미 예약이 있어요. DM과 네이버에 같은 분이 두 번 신청했는지 확인해 주세요.
        </p>
      </Modal>
    </>
  );
}

// 예약 취소 확인. 원데이는 환불 비율을 먼저 보여 준다(R-03).
export function CancelModal({ target, onClose, onDone }: { target: RosterItem | null; onClose: () => void; onDone: () => void }) {
  const [rate, setRate] = useState<number | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setRate(undefined);
    api<{ refundRate: number | null }>(`/staff/reservations/${target.id}/refund`)
      .then((r) => setRate(r.refundRate))
      .catch((e) => {
        toastError(e);
        setRate(null);
      });
  }, [target]);

  const cancel = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const r = await api<{ refundRate: number | null }>(`/staff/reservations/${target.id}/cancel`, { method: "PATCH" });
      toast(r.refundRate ? `취소했어요 (${r.refundRate === 100 ? "전액" : "50%"} 환불)` : "취소했어요", "success");
      onDone();
      onClose();
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="예약을 취소할까요?"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            돌아가기
          </Button>
          <Button variant="destructive" size="sm" loading={saving} disabled={rate === undefined} onClick={cancel}>
            예약 취소
          </Button>
        </>
      }
    >
      {target && (
        <div className="flex flex-col gap-3">
          <p>
            {target.name} 님 · {target.headcount}명 · {CHANNEL_LABEL[target.channel]}
          </p>
          {rate === undefined ? null : rate === null ? (
            <Notice>정규반 예약은 환불 비율 없이 취소돼요.</Notice>
          ) : (
            <Notice>{rate === 100 ? "수업 3일 전이라 전액 환불이에요." : "수업 3일 전이 지나 50% 환불이에요."}</Notice>
          )}
        </div>
      )}
    </Modal>
  );
}

// 수강생 환불 요청 처리: 승인하면 요청 때 정한 비율로 취소, 반려하면 요청만 지운다.
export function CancelRequestModal({ target, onClose, onDone }: { target: RosterItem | null; onClose: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState<"approve" | "reject" | null>(null);

  const decide = async (action: "approve" | "reject") => {
    if (!target) return;
    setSaving(action);
    try {
      await api(`/staff/reservations/${target.id}/cancel-request/${action}`, { method: "PATCH" });
      toast(action === "approve" ? `취소했어요 (${target.cancelRequestRate}% 환불)` : "환불 요청을 반려했어요", "success");
      onDone();
      onClose();
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="환불 요청"
      footer={
        <>
          <Button variant="secondary" size="sm" loading={saving === "reject"} disabled={!!saving} onClick={() => decide("reject")}>
            반려
          </Button>
          <Button variant="destructive" size="sm" loading={saving === "approve"} disabled={!!saving} onClick={() => decide("approve")}>
            승인·취소
          </Button>
        </>
      }
    >
      {target && (
        <div className="flex flex-col gap-3">
          <p>
            {target.name} 님 · {target.headcount}명 · {CHANNEL_LABEL[target.channel]}
          </p>
          <p className="tabular text-lg font-semibold">환불 {target.cancelRequestRate}%</p>
          {target.cancelRequestedAt && <p className="tabular text-sm text-muted">요청 {fmtDay(target.cancelRequestedAt)} {fmtTime(target.cancelRequestedAt)}</p>}
          {target.cancelReason && <p className="text-sm">{target.cancelReason}</p>}
        </div>
      )}
    </Modal>
  );
}

// 시간 변경·휴강
export function EditSessionSheet({ open, onClose, session, onDone }: SheetProps) {
  const [start, setStart] = useState(fmtTime(session.startsAt));
  const [end, setEnd] = useState(fmtTime(session.endsAt));
  const [saving, setSaving] = useState(false);
  const [askCancel, setAskCancel] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStart(fmtTime(session.startsAt));
    setEnd(fmtTime(session.endsAt));
  }, [open, session]);

  const patch = async (body: object, msg: string) => {
    setSaving(true);
    try {
      await api(`/staff/classes/${session.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast(msg, "success");
      onDone();
      setAskCancel(false);
      onClose();
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  const saveTime = () => {
    if (!start || !end) return toast("시작·종료 시간을 입력해 주세요", "error");
    if (end <= start) return toast("종료 시간이 시작보다 늦어야 해요", "error");
    patch({ start, end }, "시간을 바꿨어요");
  };

  return (
    <>
      <Sheet
        open={open && !askCancel}
        onClose={onClose}
        title="일정 수정"
        footer={
          <div className="flex flex-col gap-2">
            <Button full loading={saving} onClick={saveTime}>
              시간 저장
            </Button>
            {session.cancelled ? (
              <Button full variant="secondary" disabled={saving} onClick={() => patch({ cancelled: false }, "휴강을 풀었어요")}>
                휴강 풀기
              </Button>
            ) : (
              <Button full variant="destructive" disabled={saving} onClick={() => setAskCancel(true)}>
                휴강으로 바꾸기
              </Button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작" required>
            {(id) => <Input id={id} type="time" className="tabular" value={start} onChange={(e) => setStart(e.target.value)} />}
          </Field>
          <Field label="종료" required>
            {(id) => <Input id={id} type="time" className="tabular" value={end} onChange={(e) => setEnd(e.target.value)} />}
          </Field>
        </div>
      </Sheet>
      <Modal
        open={open && askCancel}
        onClose={() => setAskCancel(false)}
        title="휴강으로 바꿀까요?"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAskCancel(false)}>
              돌아가기
            </Button>
            <Button variant="destructive" size="sm" loading={saving} onClick={() => patch({ cancelled: true }, "휴강으로 바꿨어요")}>
              휴강
            </Button>
          </>
        }
      >
        <p>예약한 분들께는 따로 연락해 주세요.</p>
      </Modal>
    </>
  );
}

type WorkRow = { count: number; itemName: string; clay: string; glaze: string };

// 수업 후 작품 등록. 확정 참석자마다 작품 수(0~5)와 작품명을 적는다.
export function WorksSheet({ open, onClose, session, onDone }: SheetProps) {
  const attendees = session.roster.filter((r) => r.status === "CONFIRMED" && r.flag !== "MOVED_OUT");
  const [rows, setRows] = useState<Record<number, WorkRow>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setRows({});
  }, [open]);

  const row = (id: number): WorkRow => rows[id] ?? { count: 0, itemName: "", clay: "", glaze: "" };
  const set = (id: number, p: Partial<WorkRow>) => setRows((prev) => ({ ...prev, [id]: { ...row(id), ...p } }));

  const submit = async () => {
    const picked = attendees.filter((a) => row(a.id).count > 0);
    if (picked.length === 0) return toast("작품 수를 1점 이상 골라 주세요", "error");
    const noName = picked.find((a) => !row(a.id).itemName.trim());
    if (noName) return toast(`${noName.name} 님의 작품명을 입력해 주세요`, "error");
    setSaving(true);
    try {
      const r = await api<{ created: number; workNos: string[] }>(`/staff/classes/${session.id}/works`, {
        method: "POST",
        body: JSON.stringify({
          items: picked.map((a) => {
            const w = row(a.id);
            return {
              reservationId: a.id,
              ownerName: a.name,
              phoneLast4: a.phoneLast4,
              count: w.count,
              itemName: w.itemName.trim(),
              ...(w.clay.trim() ? { clay: w.clay.trim() } : {}),
              ...(w.glaze.trim() ? { glaze: w.glaze.trim() } : {}),
            };
          }),
        }),
      });
      toast(`작품 ${r.created}점을 등록했어요 (${r.workNos[0]}${r.created > 1 ? ` – ${r.workNos[r.workNos.length - 1]}` : ""})`, "success");
      onDone();
      onClose();
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  const total = attendees.reduce((n, a) => n + row(a.id).count, 0);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="작품 등록"
      footer={
        <Button full loading={saving} onClick={submit}>
          {total > 0 ? `${total}점 등록하기` : "등록하기"}
        </Button>
      }
    >
      {attendees.length === 0 ? (
        <p className="text-base text-muted">확정된 참석자가 없어요</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {attendees.map((a) => {
            const w = row(a.id);
            return (
              <li key={a.id} className="flex flex-col gap-3 border-b border-line pb-5 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {a.name}
                    {a.worksCount > 0 && <span className="tabular ml-2 text-sm font-normal text-muted">등록 {a.worksCount}점</span>}
                  </span>
                  <div className="flex items-center gap-2" role="group" aria-label={`${a.name} 작품 수`}>
                    <Button size="sm" variant="secondary" aria-label="한 점 빼기" disabled={w.count === 0} onClick={() => set(a.id, { count: w.count - 1 })}>
                      −
                    </Button>
                    <span className="tabular w-6 text-center text-lg font-semibold">{w.count}</span>
                    <Button size="sm" variant="secondary" aria-label="한 점 더하기" disabled={w.count === 5} onClick={() => set(a.id, { count: w.count + 1 })}>
                      +
                    </Button>
                  </div>
                </div>
                {w.count > 0 && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Input aria-label="작품명" value={w.itemName} maxLength={20} placeholder="컵" onChange={(e) => set(a.id, { itemName: e.target.value })} />
                    <Input aria-label="흙" value={w.clay} maxLength={40} placeholder="흙 (선택)" onChange={(e) => set(a.id, { clay: e.target.value })} />
                    <Input aria-label="유약" value={w.glaze} maxLength={40} placeholder="유약 (선택)" onChange={(e) => set(a.id, { glaze: e.target.value })} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
