"use client";

import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DateInput, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { PageTitle } from "@/components/ui/PageTitle";
import { api, ApiError } from "@/lib/api";
import { dayKey } from "@/lib/format";
import { toast } from "@/lib/notify";

const PLACES = ["공방 방문", "출장 희망"] as const;
const CONTACT = /^(0\d{1,2}-?\d{3,4}-?\d{4}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

const empty = { orgName: "", contactName: "", contact: "", preferredDate: "", headcount: "", place: "공방 방문", message: "" };

// PUB-07 단체 문의
export default function GroupPage() {
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const headcount = Number(form.headcount);
    if (!form.orgName.trim()) return toast("단체명을 입력해 주세요", "error");
    if (!form.contactName.trim()) return toast("담당자 이름을 입력해 주세요", "error");
    if (!form.contact.trim()) return toast("연락처를 입력해 주세요", "error");
    if (!CONTACT.test(form.contact.trim())) return toast("휴대폰 번호나 이메일을 정확히 입력해 주세요", "error");
    if (!form.headcount) return toast("인원을 입력해 주세요", "error");
    if (!Number.isInteger(headcount) || headcount < 1 || headcount > 50) return toast("인원은 1명부터 50명까지 받을 수 있어요", "error");
    if (!form.message.trim()) return toast("문의 내용을 입력해 주세요", "error");

    setSending(true);
    try {
      await api("/inquiries", {
        method: "POST",
        body: JSON.stringify({
          orgName: form.orgName.trim(),
          contactName: form.contactName.trim(),
          contact: form.contact.trim(),
          preferredDate: form.preferredDate || undefined,
          headcount,
          place: form.place,
          message: form.message.trim(),
        }),
      });
      setDone(true);
      setForm(empty);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 0) toast(err.message, "error");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto w-full max-w-lg pt-4 md:pt-10">
        <Card className="flex flex-col items-center gap-5 py-10 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-success-subtle text-success" aria-hidden>
            <svg className="size-6" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="text-lg font-semibold">접수됐어요. 대표님이 확인 후 연락드려요.</p>
          <ButtonLink href="/" variant="secondary">
            처음으로
          </ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <PageTitle>단체 클래스 문의</PageTitle>
      <Card>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <Field label="단체명" required>
            {(id) => <Input id={id} placeholder="회사·학교·모임 이름" value={form.orgName} onChange={set("orgName")} maxLength={60} />}
          </Field>
          <Field label="담당자" required>
            {(id) => <Input id={id} placeholder="이름" value={form.contactName} onChange={set("contactName")} maxLength={30} autoComplete="name" />}
          </Field>
          <Field label="연락처" required>
            {(id) => <Input id={id} placeholder="휴대폰 번호 또는 이메일" value={form.contact} onChange={set("contact")} maxLength={80} />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="희망 날짜">
              {(id) => <DateInput id={id} value={form.preferredDate} min={dayKey(new Date())} onChange={set("preferredDate")} />}
            </Field>
            <Field label="인원" required>
              {(id) => (
                <Input
                  id={id}
                  inputMode="numeric"
                  placeholder="1~50명"
                  value={form.headcount}
                  onChange={(e) => setForm((f) => ({ ...f, headcount: e.target.value.replace(/\D/g, "").slice(0, 2) }))}
                />
              )}
            </Field>
          </div>
          <Field label="장소">
            {(id) => (
              <Select id={id} value={form.place} onChange={set("place")}>
                {PLACES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="문의 내용" required>
            {(id) => (
              <Textarea
                id={id}
                rows={5}
                maxLength={1000}
                placeholder="모임 성격, 만들고 싶은 작품, 궁금한 점을 적어 주세요"
                value={form.message}
                onChange={set("message")}
              />
            )}
          </Field>
          <Button type="submit" full loading={sending}>
            문의 보내기
          </Button>
        </form>
      </Card>
    </div>
  );
}
