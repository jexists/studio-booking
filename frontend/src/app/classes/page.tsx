"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Notice } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { EmptyState, PageTitle, Skeleton } from "@/components/ui/PageTitle";
import { api, ApiError } from "@/lib/api";
import { dayKey, fmtDay, fmtTime, formatPhone } from "@/lib/format";
import { toast } from "@/lib/notify";

type ClassItem = { id: number; title: string; kind: "HAND" | "WHEEL"; startsAt: string; endsAt: string; capacity: number; remaining: number };

function seatBadge(c: ClassItem) {
  if (c.remaining === 0) return <Badge tone="neutral">예약 마감</Badge>;
  if (c.remaining <= 2) return <Badge tone="warning">잔여 {c.remaining}자리</Badge>;
  return <Badge tone="accent">예약 가능</Badge>;
}

// PUB-02 클래스 일정·신청
export default function ClassesPage() {
  const [items, setItems] = useState<ClassItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [target, setTarget] = useState<ClassItem | null>(null);
  const [done, setDone] = useState<{ reservationNo: string; item: ClassItem } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [headcount, setHeadcount] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    api<ClassItem[]>("/classes")
      .then(setItems)
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const open = (c: ClassItem) => {
    setTarget(c);
    setHeadcount(1);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!name.trim()) return toast("이름을 입력해 주세요", "error");
    if (!/^010-\d{4}-\d{4}$/.test(phone)) return toast("휴대폰 번호를 010-1234-5678 형식으로 입력해 주세요", "error");
    setSaving(true);
    try {
      const res = await api<{ reservationNo: string }>("/reservations", {
        method: "POST",
        body: JSON.stringify({ sessionId: target.id, name, phone, headcount }),
      });
      setDone({ reservationNo: res.reservationNo, item: target });
      setTarget(null);
      setName("");
      setPhone("");
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status !== 0) {
        toast(err.message, "error");
        if (err.status === 409) load();
      }
    } finally {
      setSaving(false);
    }
  };

  const groups = new Map<string, ClassItem[]>();
  items?.forEach((c) => groups.set(dayKey(c.startsAt), [...(groups.get(dayKey(c.startsAt)) ?? []), c]));

  return (
    <div>
      <PageTitle>클래스 신청</PageTitle>

      {done && (
        <Card className="mb-8 border-success">
          <div className="flex flex-col gap-3">
            <span className="self-start"><Badge tone="warning">예약 신청</Badge></span>
            <p className="text-lg font-semibold">
              예약 번호 <span className="tabular text-primary">{done.reservationNo}</span>
            </p>
            <p className="text-base">
              {fmtDay(done.item.startsAt)} {fmtTime(done.item.startsAt)} {done.item.title}
            </p>
            <Notice>공방에서 확인한 뒤 예약 확정으로 바뀌어요. 예약 번호와 휴대폰 뒤 4자리로 내 작품에서 확인할 수 있어요.</Notice>
          </div>
        </Card>
      )}

      {failed ? (
        <EmptyState title="일정을 불러오지 못했어요" action={<Button variant="secondary" onClick={load}>다시 불러오기</Button>} />
      ) : !items ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="열린 수업이 없어요" />
      ) : (
        <div className="flex flex-col gap-10">
          {[...groups.entries()].map(([key, list]) => (
            <section key={key}>
              <h2 className="mb-3 text-lg font-semibold">{fmtDay(list[0].startsAt)}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => (
                  <Card key={c.id} className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="tabular text-lg font-semibold">{fmtTime(c.startsAt)}</p>
                        <p className="text-base">{c.title}</p>
                      </div>
                      {seatBadge(c)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="tabular text-sm text-muted">
                        {c.capacity - c.remaining} / {c.capacity}명
                      </span>
                      <Button size="sm" variant={c.remaining === 0 ? "secondary" : "primary"} disabled={c.remaining === 0} onClick={() => open(c)}>
                        {c.remaining === 0 ? "마감" : "신청하기"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Sheet
        open={!!target}
        onClose={() => setTarget(null)}
        title="예약 신청"
        footer={
          <Button type="submit" form="reserve-form" full loading={saving}>
            예약 신청하기
          </Button>
        }
      >
        {target && (
          <form id="reserve-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
            <p className="text-base font-semibold">
              {fmtDay(target.startsAt)} {fmtTime(target.startsAt)} {target.title}
            </p>
            <Field label="이름" required>
              {(id) => <Input id={id} placeholder="홍길동" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
            </Field>
            <Field label="휴대폰" required>
              {(id) => (
                <Input id={id} inputMode="numeric" className="tabular" placeholder="010-1234-5678" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} autoComplete="tel" />
              )}
            </Field>
            <Field label="인원">
              {(id) => (
                <Select id={id} value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))}>
                  {Array.from({ length: target.remaining }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}명
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Notice>수업 3일 전까지 취소하면 전액, 그 뒤에는 50% 환불돼요.</Notice>
          </form>
        )}
      </Sheet>
    </div>
  );
}
