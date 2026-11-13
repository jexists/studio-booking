"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Notice } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { PageTitle } from "@/components/ui/PageTitle";
import { StageBar, stageLabel, type StageKey } from "@/components/ui/StageBar";
import { MakeupSection } from "@/features/makeup/MakeupSection";
import { CancelRequestSection, type CancelState } from "@/features/refund/CancelRequestSection";
import { api, ApiError } from "@/lib/api";
import { fmtDate, fmtDay, fmtTime } from "@/lib/format";
import { clearMemberSession, getMemberSession, saveMemberSession } from "@/lib/member";
import { toast } from "@/lib/notify";

type MyWork = {
  workNo: string;
  itemName: string;
  clay: string | null;
  glaze: string | null;
  stage: StageKey;
  broken: boolean;
  pickupMethod: "VISIT" | "DELIVERY" | null;
  shipStatus: "PREPARING" | "SHIPPING" | "DELIVERED" | null;
  carrierName: string | null;
  trackingNo: string | null;
  trackUrl: string | null;
  deliveredAt: string | null;
  expectedFrom: string | null;
  expectedTo: string | null;
  completedAt: string | null;
  keepUntil: string | null;
  foodWarning: { code: string; name: string; reason: string; sourceRef: string } | null;
};
type MyReservation = CancelState & {
  reservationNo: string;
  name: string;
  className: string;
  startsAt: string | null;
  works: MyWork[];
};

const STATUS: Record<MyReservation["status"], { label: string; tone: "warning" | "success" | "neutral" }> = {
  PENDING: { label: "예약 신청", tone: "warning" },
  CONFIRMED: { label: "예약 확정", tone: "success" },
  CANCELLED: { label: "취소", tone: "neutral" },
  NO_SHOW: { label: "노쇼", tone: "neutral" },
};
// 배송중: 송장번호를 크게 보여 주고, 누르면 택배사 배송조회(현재 위치) 페이지를 연다.
function TrackingBox({ w }: { w: MyWork }) {
  const body = (
    <>
      <span className="text-sm text-muted">
        배송중 · {w.carrierName} 송장번호
      </span>
      <span className="tabular text-xl font-semibold text-primary">{w.trackingNo}</span>
      {w.trackUrl && (
        <span className="flex items-center gap-1 text-sm font-semibold text-primary">
          눌러서 현재 위치 보기
          <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M6 3h7v7M13 3L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </>
  );
  const box = "flex min-h-11 flex-col gap-1 rounded-md border border-primary bg-primary-subtle px-4 py-3";
  return w.trackUrl ? (
    <a href={w.trackUrl} target="_blank" rel="noopener noreferrer" className={`${box} hover:bg-surface-muted`} aria-label={`${w.carrierName} 송장번호 ${w.trackingNo} 배송 현재 위치 보기 (새 창)`}>
      {body}
    </a>
  ) : (
    <div className={box}>{body}</div>
  );
}

function WorkCard({ w }: { w: MyWork }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-semibold">{w.itemName}</p>
        <span className="tabular text-sm text-muted">{w.workNo}</span>
      </div>
      {w.broken ? (
        <Notice tone="error">가마에서 작품이 손상됐어요. 공방에서 따로 연락드릴게요.</Notice>
      ) : (
        <p className="text-lg font-semibold text-primary">
          {w.stage === "DONE" || w.stage === "PICKED_UP" ? stageLabel(w.stage) : `${stageLabel(w.stage)} 중`}
        </p>
      )}
      <StageBar stage={w.stage} broken={w.broken} />
      {w.shipStatus === "SHIPPING" && w.trackingNo && <TrackingBox w={w} />}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {w.expectedFrom && w.expectedTo && (
          <>
            <dt className="text-muted">완성 예상</dt>
            <dd className="tabular">
              {fmtDate(w.expectedFrom)} ~ {fmtDate(w.expectedTo)} (가마 일정에 따라 달라져요)
            </dd>
          </>
        )}
        {w.completedAt && w.stage !== "PICKED_UP" && (
          <>
            <dt className="text-muted">보관 기한</dt>
            <dd className="tabular">{fmtDate(w.keepUntil!)}까지</dd>
          </>
        )}
        {w.pickupMethod && (
          <>
            <dt className="text-muted">받는 방법</dt>
            <dd>{w.pickupMethod === "VISIT" ? "방문 수령" : "택배"}</dd>
          </>
        )}
        {w.pickupMethod === "DELIVERY" && w.shipStatus && (
          <>
            <dt className="text-muted">배송</dt>
            <dd>
              <span className="font-semibold">{w.shipStatus === "PREPARING" ? "택배 준비중" : w.shipStatus === "SHIPPING" ? "배송중" : "배송완료"}</span>
              {w.shipStatus === "DELIVERED" && w.deliveredAt ? ` (${fmtDate(w.deliveredAt)})` : ""}
              {w.trackingNo && w.shipStatus !== "SHIPPING" && (
                <span className="tabular mt-0.5 block text-muted">
                  {w.carrierName} {w.trackingNo}
                  {w.trackUrl && (
                    <>
                      {" · "}
                      <a href={w.trackUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4">
                        송장 조회
                      </a>
                    </>
                  )}
                </span>
              )}
            </dd>
          </>
        )}
        {w.clay && (
          <>
            <dt className="text-muted">흙</dt>
            <dd>{w.clay}</dd>
          </>
        )}
        {w.glaze && (
          <>
            <dt className="text-muted">유약</dt>
            <dd>{w.glaze}</dd>
          </>
        )}
      </dl>
      {w.foodWarning && (
        <Notice>
          식기로 쓰지 마세요. {w.foodWarning.name}({w.foodWarning.code}): {w.foodWarning.reason}
          <span className="mt-1 block text-xs">근거: {w.foodWarning.sourceRef}</span>
        </Notice>
      )}
    </Card>
  );
}

type FoundReservation = { reservationNo: string; className: string; startsAt: string | null };

// 예약 번호를 모를 때: 휴대폰 번호 → 인증번호(임시 1111) → 예약 번호 목록
function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
}

function FindReservation({ onLookup, onBack }: { onLookup: (no: string, last4: string) => void; onBack: () => void }) {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<FoundReservation[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const send = async () => {
    if (!/^[0-9-]{10,13}$/.test(phone)) return toast("휴대폰 번호를 정확히 입력해 주세요", "error");
    setBusy(true);
    try {
      await api("/me/phone-code", { method: "POST", body: JSON.stringify({ phone }) });
      setSent(true);
      toast("인증번호를 보냈어요", "success");
    } catch (e) {
      if (e instanceof ApiError) toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{4}$/.test(code)) return toast("인증번호 4자리를 입력해 주세요", "error");
    setBusy(true);
    try {
      setFound(await api<FoundReservation[]>("/me/find-reservations", { method: "POST", body: JSON.stringify({ phone, code }) }));
    } catch (e) {
      if (e instanceof ApiError) toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const last4 = phone.replace(/\D/g, "").slice(-4);

  return (
    <Card className="flex flex-col gap-5">
      <p className="text-base font-semibold">예약 번호 찾기</p>
      <Field label="휴대폰 번호">
        {(id) => (
          <Input id={id} inputMode="tel" maxLength={13} placeholder="010-1234-5678" value={phone} disabled={sent}
            onChange={(e) => setPhone(formatPhone(e.target.value))} />
        )}
      </Field>
      {!sent ? (
        <Button type="button" full loading={busy} onClick={send}>인증번호 받기</Button>
      ) : !found ? (
        <>
          <Field label="인증번호">
            {(id) => (
              <Input id={id} inputMode="numeric" maxLength={4} placeholder="4자리" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            )}
          </Field>
          <Button type="button" full loading={busy} onClick={verify}>확인</Button>
        </>
      ) : (
        <ul className="flex flex-col gap-2">
          {found.map((f) => (
            <li key={f.reservationNo}>
              <button type="button" onClick={() => setPicked(f.reservationNo)}
                aria-pressed={picked === f.reservationNo}
                className={`w-full rounded-xl border px-4 py-3 text-left ${picked === f.reservationNo ? "border-primary bg-surface-muted ring-2 ring-primary" : "border-border"}`}>
                <span className="tabular block text-lg font-semibold">{f.reservationNo}</span>
                <span className="block text-sm text-muted">
                  {f.className}{f.startsAt ? ` · ${fmtDay(f.startsAt)} ${fmtTime(f.startsAt)}` : ""}
                </span>
              </button>
            </li>
          ))}
          <Button type="button" full disabled={!picked} onClick={() => picked && onLookup(picked, last4)}>
            {picked ? "이 예약 번호로 조회하기" : "예약을 선택해 주세요"}
          </Button>
        </ul>
      )}
      <Button type="button" variant="tertiary" size="sm" onClick={onBack}>예약 번호 입력으로 돌아가기</Button>
    </Card>
  );
}

// PUB-03·04 내 예약·작품 (조회와 결과를 한 화면에서)
export default function MePage() {
  const [no, setNo] = useState("");
  const [last4, setLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MyReservation | null>(null);
  const [phone4, setPhone4] = useState("");
  const [finding, setFinding] = useState(false);

  const lookup = async (reservationNo: string, phoneLast4: string, silent = false) => {
    setLoading(true);
    try {
      const res = await api<MyReservation>("/me/lookup", { method: "POST", body: JSON.stringify({ reservationNo, phoneLast4 }) });
      setData(res);
      setPhone4(phoneLast4);
      saveMemberSession({ name: res.name, reservationNo, phoneLast4 });
    } catch (e) {
      if (!silent && e instanceof ApiError && e.status !== 0) {
        toast(e.status === 404 ? "예약 번호나 휴대폰 뒤 4자리가 맞지 않아요" : e.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // 새로고침해도 이번 탭에서는 다시 입력하지 않게
  useEffect(() => {
    try {
      const s = getMemberSession();
      if (s) {
        lookup(s.reservationNo, s.phoneLast4, true);
      }
    } catch {}
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!no.trim()) return toast("예약 번호를 입력해 주세요", "error");
    if (!/^\d{4}$/.test(last4)) return toast("휴대폰 뒤 4자리를 입력해 주세요", "error");
    lookup(no.trim(), last4);
  };

  const reset = () => {
    clearMemberSession();
    setData(null);
  };

  if (data) {
    const st = STATUS[data.status];
    return (
      <div className="mx-auto w-full max-w-2xl">
        <PageTitle action={<Button variant="tertiary" size="sm" onClick={reset}>다른 예약 보기</Button>}>
          {data.name} 님의 작품
        </PageTitle>
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold">{data.className}</p>
            {data.startsAt && (
              <p className="tabular text-sm text-muted">
                {fmtDay(data.startsAt)} {fmtTime(data.startsAt)} · 예약 번호 {data.reservationNo}
              </p>
            )}
          </div>
          <Badge tone={st.tone}>{st.label}</Badge>
        </Card>
        {data.works.length === 0 ? (
          <Card className="text-center text-base text-muted">수업이 끝나면 여기에서 작품 진행 상황을 볼 수 있어요.</Card>
        ) : (
          <div className="flex flex-col gap-4">
            {data.works.map((w) => (
              <WorkCard key={w.workNo} w={w} />
            ))}
          </div>
        )}
        {data.program === "ONEDAY" && phone4 && (
          <CancelRequestSection data={data} reservationNo={data.reservationNo} phoneLast4={phone4} onDone={() => lookup(data.reservationNo, phone4, true)} />
        )}
        {data.program === "REGULAR" && data.status !== "CANCELLED" && phone4 && (
          <MakeupSection reservationNo={data.reservationNo} phoneLast4={phone4} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm pt-4 md:pt-10">
      <PageTitle>내 작품 보기</PageTitle>
      {finding ? (
        <FindReservation onLookup={(n, p4) => { setNo(n); setLast4(p4); lookup(n, p4); }} onBack={() => setFinding(false)} />
      ) : (
      <>
      <Card>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <Field label="예약 번호">
            {(id) => <Input id={id} placeholder="A1B2C3" value={no} onChange={(e) => setNo(e.target.value)} autoCapitalize="characters" />}
          </Field>
          <Field label="휴대폰 뒤 4자리">
            {(id) => (
              <Input id={id} inputMode="numeric" maxLength={4} placeholder="5678" value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))} />
            )}
          </Field>
          <Button type="submit" full loading={loading}>
            조회하기
          </Button>
        </form>
      </Card>
      <div className="mt-4 text-center">
        <Button type="button" variant="tertiary" size="sm" onClick={() => setFinding(true)}>예약 번호 찾기</Button>
      </div>
      </>
      )}
    </div>
  );
}
