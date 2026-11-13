"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { EmptyState, PageTitle, Skeleton } from "@/components/ui/PageTitle";
import { api, ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { fmtDate, fmtDay, fmtDateYear } from "@/lib/format";
import { toast } from "@/lib/notify";

type Status = "NEW" | "QUOTED" | "CONFIRMED" | "DONE" | "CANCELLED";
type Inquiry = {
  id: number;
  orgName: string;
  contactName: string;
  contact: string;
  preferredDate: string | null;
  headcount: number;
  place: string | null;
  message: string;
  status: Status;
  quoteAmount: number | null;
  memo: string | null;
  createdAt: string;
};
type ListResult = { items: Inquiry[]; counts: Record<Status, number>; total: number };

const STATUSES: { key: Status; label: string; tone: BadgeTone }[] = [
  { key: "NEW", label: "문의", tone: "warning" },
  { key: "QUOTED", label: "견적 발송", tone: "primary" },
  { key: "CONFIRMED", label: "확정", tone: "success" },
  { key: "DONE", label: "완료", tone: "accent" },
  { key: "CANCELLED", label: "취소", tone: "neutral" },
];
const statusOf = (s: Status) => STATUSES.find((x) => x.key === s)!;
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

function contactHref(c: string) {
  if (c.includes("@")) return `mailto:${c}`;
  if (/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(c)) return `tel:${c.replace(/-/g, "")}`;
  return null;
}

// 상세 시트 안의 편집 영역. 문의가 바뀌면 key 로 새로 만들어 입력값을 초기화한다.
function Detail({ item, isOwner, onSaved }: { item: Inquiry; isOwner: boolean; onSaved: (i: Inquiry) => void }) {
  const [memo, setMemo] = useState(item.memo ?? "");
  const [status, setStatus] = useState<Status>(item.status);
  const [amount, setAmount] = useState(item.quoteAmount != null ? String(item.quoteAmount) : "");
  const [busy, setBusy] = useState<"" | "memo" | "quote">("");

  const save = async (kind: "memo" | "quote", body: Record<string, unknown>, msg: string) => {
    setBusy(kind);
    try {
      const r = await api<Inquiry>(`/staff/inquiries/${item.id}`, { method: "PATCH", body: JSON.stringify(body) });
      onSaved(r);
      toast(msg, "success");
    } catch (e) {
      if (e instanceof ApiError && e.status !== 0) toast(e.message, "error");
    } finally {
      setBusy("");
    }
  };

  const saveMemo = () => {
    if (memo.trim() === (item.memo ?? "")) return toast("바뀐 메모가 없어요");
    save("memo", { memo: memo.trim() }, "메모를 저장했어요");
  };

  const saveQuote = () => {
    const quoteAmount = amount ? Number(amount) : null;
    const body: Record<string, unknown> = {};
    if (status !== item.status) body.status = status;
    if (quoteAmount !== item.quoteAmount) body.quoteAmount = quoteAmount;
    if (!Object.keys(body).length) return toast("바뀐 내용이 없어요");
    if (status === "QUOTED" && quoteAmount == null) return toast("견적 금액을 입력해 주세요", "error");
    save("quote", body, "견적·상태를 저장했어요");
  };

  const href = contactHref(item.contact);

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-muted">담당자</dt>
        <dd>{item.contactName}</dd>
        <dt className="text-muted">연락처</dt>
        <dd className="break-all">
          {href ? (
            <a href={href} className="text-primary underline underline-offset-4">
              {item.contact}
            </a>
          ) : (
            item.contact
          )}
        </dd>
        <dt className="text-muted">인원</dt>
        <dd className="tabular">{item.headcount}명</dd>
        <dt className="text-muted">희망일</dt>
        <dd className="tabular">{item.preferredDate ? fmtDateYear(item.preferredDate) : "미정"}</dd>
        <dt className="text-muted">장소</dt>
        <dd>{item.place ?? "미정"}</dd>
        <dt className="text-muted">접수일</dt>
        <dd className="tabular">{fmtDay(item.createdAt)}</dd>
      </dl>

      <section>
        <h3 className="mb-2 text-sm font-semibold">문의 내용</h3>
        <p className="rounded-md bg-surface-muted px-4 py-3 text-sm whitespace-pre-wrap">{item.message}</p>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        {isOwner ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="상태">
                {(id) => (
                  <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                    {STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="견적 금액">
                {(id) => (
                  <div className="relative">
                    <Input
                      id={id}
                      inputMode="numeric"
                      placeholder="0"
                      className="tabular pr-10 text-right"
                      value={amount ? Number(amount).toLocaleString("ko-KR") : ""}
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted">원</span>
                  </div>
                )}
              </Field>
            </div>
            <Button variant="secondary" loading={busy === "quote"} disabled={!!busy && busy !== "quote"} onClick={saveQuote}>
              견적·상태 저장
            </Button>
          </>
        ) : (
          <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted">상태</dt>
            <dd>
              <Badge tone={statusOf(item.status).tone}>{statusOf(item.status).label}</Badge>
            </dd>
            <dt className="text-muted">견적 금액</dt>
            <dd className="tabular">{item.quoteAmount != null ? won(item.quoteAmount) : "—"}</dd>
          </dl>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <Field label="메모">
          {(id) => <Textarea id={id} rows={4} maxLength={1000} placeholder="통화 내용, 입금 확인 등" value={memo} onChange={(e) => setMemo(e.target.value)} />}
        </Field>
        <Button variant="secondary" loading={busy === "memo"} disabled={!!busy && busy !== "memo"} onClick={saveMemo}>
          메모 저장
        </Button>
      </section>
    </div>
  );
}

// STF-09 단체 문의·견적 관리 (상태·금액 변경은 대표만)
export default function InquiriesPage() {
  const [filter, setFilter] = useState<Status | "">("");
  const [data, setData] = useState<ListResult | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // 역할은 브라우저 저장소에서 읽으므로 화면이 뜬 뒤에 정한다.
  useEffect(() => setIsOwner(getSession()?.role === "OWNER"), []);

  const load = useCallback(() => {
    setData(null);
    api<ListResult>(`/staff/inquiries${filter ? `?status=${filter}` : ""}`)
      .then(setData)
      .catch(() => setData({ items: [], counts: { NEW: 0, QUOTED: 0, CONFIRMED: 0, DONE: 0, CANCELLED: 0 }, total: 0 }));
  }, [filter]);
  useEffect(load, [load]);

  const open = useMemo(() => data?.items.find((i) => i.id === openId) ?? null, [data, openId]);
  const close = useCallback(() => setOpenId(null), []);

  const onSaved = (r: Inquiry) => {
    setData((prev) => {
      if (!prev) return prev;
      const old = prev.items.find((i) => i.id === r.id);
      const counts = { ...prev.counts };
      if (old && old.status !== r.status) {
        counts[old.status] -= 1;
        counts[r.status] += 1;
      }
      return { ...prev, counts, items: prev.items.map((i) => (i.id === r.id ? r : i)) };
    });
  };

  const tabs = [{ key: "" as const, label: "전체", count: data?.total }, ...STATUSES.map((s) => ({ key: s.key, label: s.label, count: data?.counts[s.key] }))];

  return (
    <>
      <PageTitle>단체 문의</PageTitle>

      <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="문의 상태">
        {tabs.map((t) => (
          <button
            key={t.key || "all"}
            type="button"
            role="tab"
            aria-selected={filter === t.key}
            onClick={() => setFilter(t.key)}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap ${filter === t.key ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary"}`}
          >
            {t.label}
            {t.count != null && <span className="tabular ml-1 opacity-80">{t.count}</span>}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState title={filter ? `${statusOf(filter).label} 상태인 문의가 없어요` : "아직 들어온 문의가 없어요"} />
      ) : (
        <Card className="p-0 sm:p-0">
          <ul>
            {data.items.map((i) => {
              const st = statusOf(i.status);
              return (
                <li key={i.id} className="border-b border-line last:border-0">
                  <button type="button" onClick={() => setOpenId(i.id)} className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{i.orgName}</span>
                      <span className="tabular block truncate text-sm text-muted">
                        {fmtDate(i.createdAt)} 접수 · {i.headcount}명 · 희망 {i.preferredDate ? fmtDateYear(i.preferredDate) : "미정"}
                        {i.quoteAmount != null ? ` · ${won(i.quoteAmount)}` : ""}
                      </span>
                    </span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Sheet open={!!open} onClose={close} title={open?.orgName ?? ""}>
        {open && <Detail key={open.id} item={open} isOwner={isOwner} onSaved={onSaved} />}
      </Sheet>
    </>
  );
}
