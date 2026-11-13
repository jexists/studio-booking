"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Notice } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Modal, Sheet } from "@/components/ui/Overlay";
import { EmptyState, PageTitle, Skeleton } from "@/components/ui/PageTitle";
import { api, ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { toast } from "@/lib/notify";

type Member = { id: number; name: string; email: string; role: "OWNER" | "STAFF"; active: boolean };
type Members = { staff: Member[]; pendingInvites: { id: number; email: string; expiresAt: string }[] };
type InviteResult = { email: string; link: string; mailSent: boolean };

const fmt = (iso: string) => new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

// STF-11 직원 관리 (대표만)
export default function MembersPage() {
  const [data, setData] = useState<Members | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [target, setTarget] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const me = getSession();

  const load = useCallback(() => {
    api<Members>("/staff/members")
      .then(setData)
      .catch((e) => e instanceof ApiError && e.status === 403 && setForbidden(true));
  }, []);
  useEffect(load, [load]);

  const closeInvite = () => {
    setInviteOpen(false);
    setEmail("");
    setResult(null);
  };

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast("이메일을 입력해 주세요", "error");
    setSending(true);
    try {
      const r = await api<InviteResult>("/staff/members/invite", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      setResult(r);
      toast(r.mailSent ? "초대 메일을 보냈어요" : "초대 링크를 만들었어요", "success");
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status !== 0) toast(err.message, "error");
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      toast("초대 링크를 복사했어요", "success");
    } catch {
      toast("복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.", "error");
    }
  };

  const toggle = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await api(`/staff/members/${target.id}`, { method: "PATCH", body: JSON.stringify({ active: !target.active }) });
      toast(target.active ? `${target.name} 님을 비활성화했어요` : `${target.name} 님을 다시 활성화했어요`, "success");
      setTarget(null);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status !== 0) toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) return <EmptyState title="대표만 볼 수 있어요" />;

  return (
    <>
      <PageTitle action={<Button size="sm" onClick={() => setInviteOpen(true)}>직원 초대</Button>}>직원</PageTitle>

      {!data ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Card className="p-0 sm:p-0">
            <ul>
              {data.staff.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{m.name}</span>
                      <Badge tone={m.role === "OWNER" ? "primary" : "neutral"}>{m.role === "OWNER" ? "대표" : "강사"}</Badge>
                      {!m.active && <Badge tone="error">비활성</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted">{m.email}</p>
                  </div>
                  {m.email !== me?.email && (
                    <Button size="sm" variant={m.active ? "destructive" : "secondary"} onClick={() => setTarget(m)}>
                      {m.active ? "비활성화" : "활성화"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          {data.pendingInvites.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">초대 중</h2>
              <Card className="p-0 sm:p-0">
                <ul>
                  {data.pendingInvites.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 text-sm last:border-0">
                      <span className="truncate">{i.email}</span>
                      <span className="tabular shrink-0 text-muted">{fmt(i.expiresAt)}까지</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}
        </div>
      )}

      <Sheet
        open={inviteOpen}
        onClose={closeInvite}
        title="직원 초대"
        footer={
          result ? (
            <Button full variant="secondary" onClick={closeInvite}>
              닫기
            </Button>
          ) : (
            <Button full type="submit" form="invite-form" loading={sending}>
              초대 보내기
            </Button>
          )
        }
      >
        {result ? (
          <div className="flex flex-col gap-4">
            {!result.mailSent && <Notice>메일을 보내지 못했어요. 아래 링크를 복사해 직접 전달해 주세요.</Notice>}
            <Field label={`${result.email} 초대 링크`}>{(id) => <Input id={id} value={result.link} readOnly onFocus={(e) => e.target.select()} />}</Field>
            <Button variant="secondary" onClick={copy}>
              링크 복사
            </Button>
          </div>
        ) : (
          <form id="invite-form" onSubmit={invite} noValidate>
            <Field label="이메일" required>
              {(id) => <Input id={id} type="email" placeholder="teacher@naver.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}
            </Field>
          </form>
        )}
      </Sheet>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={target?.active ? "직원 비활성화" : "직원 활성화"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setTarget(null)}>
              그대로 두기
            </Button>
            <Button variant={target?.active ? "destructive" : "primary"} size="sm" loading={saving} onClick={toggle}>
              {target?.active ? "비활성화" : "활성화"}
            </Button>
          </>
        }
      >
        {target?.active ? <Notice>{target.name} 님은 바로 로그아웃되고 다시 로그인할 수 없어요.</Notice> : <p>{target?.name} 님이 다시 로그인할 수 있어요.</p>}
      </Modal>
    </>
  );
}
