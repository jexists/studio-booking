"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Notice } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Overlay";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/lib/notify";

export type CancelState = {
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "NO_SHOW";
  program: "ONEDAY" | "REGULAR";
  canRequestCancel: boolean;
  expectedRefundRate: number | null;
  cancelRequestedAt: string | null;
  cancelRequestRate: number | null;
  refundRate: number | null;
};

const RULE = "수업 3일 전까지 전액, 이후 50% 환불 (요청한 날 기준)";

// 원데이 취소·환불 요청: 상태 안내 + [취소·환불 요청] 확인 모달. 실제 취소는 공방 확인 후.
export function CancelRequestSection({
  data,
  reservationNo,
  phoneLast4,
  onDone,
}: {
  data: CancelState;
  reservationNo: string;
  phoneLast4: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (data.program !== "ONEDAY") return null;

  let line: string | null = null;
  if (data.status === "NO_SHOW") line = "노쇼 · 환불 대상 아님";
  else if (data.status === "CANCELLED") line = data.refundRate ? `취소 완료 · 환불 ${data.refundRate}%` : "취소 완료";
  else if (data.cancelRequestedAt) line = `환불 요청 접수 · 예상 환불 ${data.cancelRequestRate}%`;
  if (!line && !data.canRequestCancel) return null;

  const submit = async () => {
    setSaving(true);
    try {
      await api("/me/cancel-request", {
        method: "POST",
        body: JSON.stringify({ reservationNo, phoneLast4, ...(reason.trim() ? { reason: reason.trim() } : {}) }),
      });
      toast("환불 요청을 접수했어요. 공방 확인 후 취소돼요", "success");
      setOpen(false);
      setReason("");
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.status !== 0) toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">취소·환불</h2>
        {data.canRequestCancel && (
          <Button size="sm" variant="destructive" onClick={() => setOpen(true)}>
            취소·환불 요청
          </Button>
        )}
      </div>
      {line && <Card className="text-base font-semibold">{line}</Card>}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="취소·환불 요청"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              돌아가기
            </Button>
            <Button variant="destructive" size="sm" loading={saving} onClick={submit}>
              요청하기
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="tabular text-lg font-semibold">예상 환불 {data.expectedRefundRate}%</p>
          <Notice>{RULE}</Notice>
          <Field label="사유">
            {(id) => <Textarea id={id} rows={3} maxLength={200} placeholder="선택" value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
        </div>
      </Modal>
    </section>
  );
}
