"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Notice } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { EmptyState, PageTitle, Skeleton } from "@/components/ui/PageTitle";
import { STAGES, StageBar, stageLabel, type StageKey } from "@/components/ui/StageBar";
import { api, ApiError } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { toast } from "@/lib/notify";

type ShipStatus = "PREPARING" | "SHIPPING" | "DELIVERED";
type Work = {
  id: number;
  workNo: string;
  ownerName: string;
  phoneLast4: string | null;
  itemName: string;
  clay: string | null;
  glaze: string | null;
  stage: StageKey;
  broken: boolean;
  shelf: string | null;
  pickupMethod: "VISIT" | "DELIVERY" | null;
  shipStatus: ShipStatus | null;
  carrier: string | null;
  carrierName: string | null;
  trackingNo: string | null;
  trackUrl: string | null;
  deliveredAt: string | null;
  classDate: string;
  completedAt: string | null;
  expectedFrom: string | null;
  expectedTo: string | null;
  keepUntil: string | null;
  overdue: boolean;
  memo: string | null;
  foodWarning: { code: string; reason: string; sourceRef: string } | null;
};
type Summary = { byStage: Record<StageKey, number>; broken: number; overdue: number; kiln: { min: number; bisqueWaiting: number; glazeWaiting: number } };

type Filter = "" | StageKey | "broken" | "overdue" | "decorative";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "", label: "전체" },
  ...STAGES.map((s) => ({ key: s.key as Filter, label: s.label })),
  { key: "broken", label: "파손" },
  { key: "overdue", label: "보관 기한 지남" },
  { key: "decorative", label: "식기 불가" },
];
const PICKUP = { VISIT: "방문", DELIVERY: "택배" } as const;
const CARRIERS = [
  { value: "CJ", label: "CJ대한통운" },
  { value: "POST", label: "우체국택배" },
  { value: "HANJIN", label: "한진택배" },
  { value: "LOTTE", label: "롯데택배" },
  { value: "LOGEN", label: "로젠택배" },
];
const SHIP_STEPS: { key: ShipStatus; label: string }[] = [
  { key: "PREPARING", label: "택배 준비중" },
  { key: "SHIPPING", label: "배송중" },
  { key: "DELIVERED", label: "배송완료" },
];

// 택배 작품의 배송 진행: 준비중 → (송장 입력) → 배송중 → (확인) → 배송완료
function ShippingPanel({ work, busy, onShip, onDeliver }: { work: Work; busy: boolean; onShip: (carrier: string, trackingNo: string) => void; onDeliver: () => void }) {
  const status = work.shipStatus ?? "PREPARING";
  const [editing, setEditing] = useState(false);
  const [carrier, setCarrier] = useState(work.carrier ?? "CJ");
  const [no, setNo] = useState(work.trackingNo ?? "");
  const idx = SHIP_STEPS.findIndex((x) => x.key === status);
  const canShip = work.stage === "DONE" && !work.broken;
  const form = (
    <div className="flex flex-col gap-3">
      <Field label="택배사">
        {(id) => (
          <Select id={id} value={carrier} onChange={(e) => setCarrier(e.target.value)}>
            {CARRIERS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="송장번호">
        {(id) => <Input id={id} inputMode="numeric" className="tabular" placeholder="숫자만 입력" value={no} onChange={(e) => setNo(e.target.value.replace(/[^\d-]/g, "").slice(0, 24))} />}
      </Field>
      <Button
        loading={busy}
        onClick={() => {
          onShip(carrier, no);
          setEditing(false);
        }}
      >
        {status === "SHIPPING" ? "송장 수정하기" : "송장 입력하고 발송"}
      </Button>
    </div>
  );
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line p-4">
      <h3 className="text-sm font-semibold">택배 배송</h3>
      <ol className="grid grid-cols-3 gap-1.5" aria-label="배송 진행">
        {SHIP_STEPS.map((x, i) => (
          <li key={x.key} aria-current={i === idx ? "step" : undefined} className="flex flex-col gap-1">
            <span className={`h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-line"}`} />
            <span className={`text-center text-xs ${i === idx ? "font-semibold text-ink" : "text-muted"}`}>{x.label}</span>
          </li>
        ))}
      </ol>
      {status === "PREPARING" &&
        (canShip ? form : <p className="text-sm text-muted">{work.broken ? "파손된 작품은 발송할 수 없어요." : "작품이 완성되면 송장을 입력할 수 있어요."}</p>)}
      {status === "SHIPPING" && (
        <>
          <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted">택배사</dt>
            <dd>{work.carrierName}</dd>
            <dt className="text-muted">송장번호</dt>
            <dd className="tabular">{work.trackingNo}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            {work.trackUrl && (
              <a href={work.trackUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-primary hover:bg-primary-subtle">
                송장 조회
              </a>
            )}
            <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)}>
              {editing ? "수정 닫기" : "송장 수정"}
            </Button>
          </div>
          {editing && form}
          <Button loading={busy} onClick={onDeliver}>
            배송완료로 변경
          </Button>
        </>
      )}
      {status === "DELIVERED" && (
        <>
          <p className="tabular text-sm">
            {work.deliveredAt ? `${fmtDate(work.deliveredAt)} 배송이 끝났어요.` : "배송이 끝났어요."} ({work.carrierName} {work.trackingNo})
          </p>
          {work.trackUrl && (
            <a href={work.trackUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary underline underline-offset-4">
              송장 조회
            </a>
          )}
        </>
      )}
    </section>
  );
}

// 받침 있으면 "으로", 없거나 ㄹ 받침이면 "로" (유약으로, 초벌로)
function ro(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}로`;
  const jong = code % 28;
  return jong === 0 || jong === 8 ? `${word}로` : `${word}으로`;
}

function nextLabel(stage: StageKey) {
  const i = STAGES.findIndex((s) => s.key === stage);
  return STAGES[i + 1]?.label;
}

function query(filter: Filter, q: string) {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  if (filter === "broken" || filter === "overdue" || filter === "decorative") p.set(filter, "true");
  else if (filter) p.set("stage", filter);
  const s = p.toString();
  return s ? `?${s}` : "";
}

// STF-06 작품 목록·단계 변경
export default function WorksPage() {
  const [filter, setFilter] = useState<Filter>("");
  const [q, setQ] = useState("");
  const [works, setWorks] = useState<Work[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Work[]>(`/staff/works${query(filter, q)}`).then(setWorks).catch(() => setWorks([]));
    api<Summary>("/staff/works/summary").then(setSummary).catch(() => undefined);
  }, [filter, q]);

  // 검색어는 입력이 멈춘 뒤 0.3초에 조회
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const open = useMemo(() => works?.find((w) => w.id === openId) ?? null, [works, openId]);

  const replace = (w: Work) => setWorks((prev) => prev?.map((p) => (p.id === w.id ? w : p)) ?? null);

  const run = async (fn: () => Promise<Work>, done: (w: Work) => string) => {
    setBusy(true);
    try {
      const w = await fn();
      replace(w);
      toast(done(w), "success");
      api<Summary>("/staff/works/summary").then(setSummary).catch(() => undefined);
    } catch (e) {
      if (e instanceof ApiError && e.status !== 0) toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const move = (w: Work, direction: "next" | "prev") =>
    run(
      () => api<Work>(`/staff/works/${w.id}/stage`, { method: "PATCH", body: JSON.stringify({ direction }) }),
      (r) => (direction === "next" ? `${ro(stageLabel(r.stage))} 넘겼어요` : `${ro(stageLabel(r.stage))} 되돌렸어요`),
    );

  const patch = (w: Work, body: Partial<Pick<Work, "pickupMethod" | "shelf" | "broken">>, msg: string) =>
    run(() => api<Work>(`/staff/works/${w.id}`, { method: "PATCH", body: JSON.stringify(body) }), () => msg);

  const ship = (w: Work, carrier: string, trackingNo: string) =>
    run(() => api<Work>(`/staff/works/${w.id}/ship`, { method: "PATCH", body: JSON.stringify({ carrier, trackingNo }) }), () => "송장을 저장하고 배송중으로 바꿨어요");
  const deliver = (w: Work) => run(() => api<Work>(`/staff/works/${w.id}/deliver`, { method: "PATCH" }), () => "배송완료로 바꾸고 수령 처리했어요");

  const bulkNext = async () => {
    setBusy(true);
    try {
      const r = await api<{ moved: number; skipped: { workNo: string; reason: string }[] }>("/staff/works/bulk-next", {
        method: "POST",
        body: JSON.stringify({ ids: [...checked] }),
      });
      toast(r.skipped.length ? `${r.moved}점 넘겼어요. ${r.skipped.length}점은 넘기지 못했어요 (${r.skipped[0].workNo}: ${r.skipped[0].reason})` : `${r.moved}점을 다음 단계로 넘겼어요`, r.skipped.length ? "error" : "success");
      setChecked(new Set());
      load();
    } catch (e) {
      if (e instanceof ApiError && e.status !== 0) toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleCheck = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <PageTitle>작품</PageTitle>

      {summary && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          {[
            { label: "초벌 대기", value: summary.kiln.bisqueWaiting, filter: "FORMING" as Filter },
            { label: "재벌 대기", value: summary.kiln.glazeWaiting, filter: "GLAZED" as Filter },
          ].map((k) => {
            const ready = k.value >= summary.kiln.min;
            return (
              <button
                key={k.label}
                type="button"
                onClick={() => setFilter(k.filter)}
                className={`flex flex-col items-start gap-1 rounded-lg border bg-surface p-4 text-left transition-colors hover:border-primary ${ready ? "border-success" : "border-line"}`}
              >
                <span className="text-sm text-muted">{k.label}</span>
                <span className="tabular text-lg font-semibold">
                  {k.value}
                  <span className="text-sm font-normal text-muted"> / {summary.kiln.min}점</span>
                </span>
                {ready && <Badge tone="success">가마 가동 가능</Badge>}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-3">
        <Input type="search" placeholder="작품 번호 · 이름 · 휴대폰 뒤 4자리" value={q} onChange={(e) => setQ(e.target.value)} aria-label="작품 검색" />
      </div>
      <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="작품 필터">
        {FILTERS.map((f) => (
          <button
            key={f.key || "all"}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap ${filter === f.key ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary"}`}
          >
            {f.label}
            {f.key && summary && f.key in summary.byStage ? <span className="tabular ml-1 opacity-80">{summary.byStage[f.key as StageKey]}</span> : null}
          </button>
        ))}
      </div>

      {checked.size > 0 && (
        <div className="sticky top-20 z-30 mb-3 flex items-center justify-between gap-3 rounded-md border border-primary bg-primary-subtle px-4 py-2">
          <span className="text-sm font-semibold text-primary">{checked.size}점 선택</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setChecked(new Set())}>
              선택 해제
            </Button>
            <Button size="sm" loading={busy} onClick={bulkNext}>
              다음 단계로
            </Button>
          </div>
        </div>
      )}

      {!works ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : works.length === 0 ? (
        <EmptyState title="조건에 맞는 작품이 없어요" action={<Button variant="secondary" size="sm" onClick={() => { setFilter(""); setQ(""); }}>필터 초기화</Button>} />
      ) : (
        <Card className="p-0 sm:p-0">
          <ul>
            {works.map((w) => (
              <li key={w.id} className="flex items-center gap-3 border-b border-line px-4 last:border-0">
                <input
                  type="checkbox"
                  aria-label={`${w.workNo} 선택`}
                  checked={checked.has(w.id)}
                  onChange={() => toggleCheck(w.id)}
                  className="hidden size-5 shrink-0 accent-[var(--hf-primary)] md:block"
                />
                <button type="button" onClick={() => setOpenId(w.id)} className="flex min-h-16 min-w-0 flex-1 items-center justify-between gap-3 py-3 text-left">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold">{w.itemName}</span>
                      <span className="tabular text-sm text-muted">{w.workNo}</span>
                      {w.broken && <Badge tone="error">파손</Badge>}
                      {w.foodWarning && <Badge tone="warning">식기 불가</Badge>}
                      {w.overdue && <Badge tone="warning">보관 기한 지남</Badge>}
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {w.ownerName} · {fmtDate(w.classDate)} 수업{w.shelf ? ` · 선반 ${w.shelf}` : ""}
                    </span>
                  </span>
                  <Badge tone={w.stage === "PICKED_UP" ? "neutral" : w.stage === "DONE" ? "success" : "primary"}>{stageLabel(w.stage)}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Sheet
        open={!!open}
        onClose={() => setOpenId(null)}
        title={open ? `${open.itemName} · ${open.workNo}` : ""}
        footer={
          open && (
            <div className="flex flex-col gap-2">
              {nextLabel(open.stage) && !(open.stage === "DONE" && open.pickupMethod === "DELIVERY") && (
                <Button full loading={busy} onClick={() => move(open, "next")}>
                  {ro(nextLabel(open.stage)!)} 넘기기
                </Button>
              )}
              <div className="flex justify-between">
                <Button variant="tertiary" size="sm" disabled={open.stage === "FORMING" || busy} onClick={() => move(open, "prev")}>
                  한 단계 되돌리기
                </Button>
                <Button variant="tertiary" size="sm" className="text-error" disabled={busy} onClick={() => patch(open, { broken: !open.broken }, open.broken ? "파손 표시를 지웠어요" : "파손으로 표시했어요")}>
                  {open.broken ? "파손 표시 지우기" : "파손 표시"}
                </Button>
              </div>
            </div>
          )
        }
      >
        {open && (
          <div className="flex flex-col gap-5">
            <StageBar stage={open.stage} broken={open.broken} />
            {open.foodWarning && (
              <Notice>
                {open.foodWarning.reason} ({open.foodWarning.code}, {open.foodWarning.sourceRef})
              </Notice>
            )}
            <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted">수강생</dt>
              <dd>
                {open.ownerName}
                {open.phoneLast4 ? ` (${open.phoneLast4})` : ""}
              </dd>
              <dt className="text-muted">수업일</dt>
              <dd className="tabular">{fmtDate(open.classDate)}</dd>
              <dt className="text-muted">흙</dt>
              <dd>{open.clay ?? "—"}</dd>
              <dt className="text-muted">유약</dt>
              <dd>{open.glaze ?? "미정"}</dd>
              {open.expectedFrom && open.expectedTo ? (
                <>
                  <dt className="text-muted">완성 예상</dt>
                  <dd className="tabular">
                    {fmtDate(open.expectedFrom)} – {fmtDate(open.expectedTo)}
                  </dd>
                </>
              ) : (
                <>
                  <dt className="text-muted">보관 기한</dt>
                  <dd className={`tabular ${open.overdue ? "font-semibold text-warning" : ""}`}>{open.keepUntil ? fmtDate(open.keepUntil) : "—"}</dd>
                </>
              )}
              {open.memo && (
                <>
                  <dt className="text-muted">메모</dt>
                  <dd>{open.memo}</dd>
                </>
              )}
            </dl>
            <div className="grid grid-cols-2 gap-3">
              <Field label="수령 방식">
                {(id) => (
                  <Select
                    id={id}
                    value={open.pickupMethod ?? ""}
                    onChange={(e) => {
                      const v = (e.target.value || null) as Work["pickupMethod"];
                      patch(open, { pickupMethod: v }, v ? `수령 방식을 ${ro(PICKUP[v])} 정했어요` : "수령 방식을 지웠어요");
                    }}
                  >
                    <option value="">미정</option>
                    <option value="VISIT">방문</option>
                    <option value="DELIVERY">택배</option>
                  </Select>
                )}
              </Field>
              <Field label="선반">
                {(id) => (
                  <Input
                    id={id}
                    key={`${open.id}-${open.shelf}`}
                    defaultValue={open.shelf ?? ""}
                    placeholder="A-1"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (open.shelf ?? "")) patch(open, { shelf: v }, "선반 위치를 바꿨어요");
                    }}
                  />
                )}
              </Field>
            </div>
            {open.pickupMethod === "DELIVERY" && (
              <ShippingPanel key={`${open.id}-${open.shipStatus}-${open.trackingNo}`} work={open} busy={busy} onShip={(c, n) => ship(open, c, n)} onDeliver={() => deliver(open)} />
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
