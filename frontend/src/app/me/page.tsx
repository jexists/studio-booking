"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Notice } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { PageTitle } from "@/components/ui/PageTitle";
import { StageBar, stageLabel, type StageKey } from "@/components/ui/StageBar";
import { MakeupSection } from "@/features/makeup/MakeupSection";
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
type MyReservation = {
  reservationNo: string;
  name: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  program: "ONEDAY" | "REGULAR";
  className: string;
  startsAt: string | null;
  works: MyWork[];
};

const STATUS: Record<MyReservation["status"], { label: string; tone: "warning" | "success" | "neutral" }> = {
  PENDING: { label: "예약 신청", tone: "warning" },
  CONFIRMED: { label: "예약 확정", tone: "success" },
  CANCELLED: { label: "취소", tone: "neutral" },
};
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
              {w.trackingNo && (
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

// PUB-03·04 내 예약·작품 (조회와 결과를 한 화면에서)
export default function MePage() {
  const [no, setNo] = useState("");
  const [last4, setLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MyReservation | null>(null);
  const [phone4, setPhone4] = useState("");

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
        {data.program === "REGULAR" && data.status !== "CANCELLED" && phone4 && (
          <MakeupSection reservationNo={data.reservationNo} phoneLast4={phone4} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm pt-4 md:pt-10">
      <PageTitle>내 작품 보기</PageTitle>
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
    </div>
  );
}
