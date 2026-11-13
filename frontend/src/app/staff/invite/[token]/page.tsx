"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ButtonLink, Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/PageTitle";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/lib/notify";

type Errors = Partial<Record<"name" | "password" | "confirm", string>>;

// STF-02 초대 받은 직원의 비밀번호 설정. 여러 칸 오류가 나는 폼이라 오류를 입력 아래에 보여 준다.
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ email: string }>(`/auth/invite/${token}`)
      .then((r) => setEmail(r.email))
      .catch((e) => setInvalid(e instanceof ApiError && e.status !== 0 ? e.message : "초대를 확인하지 못했어요"));
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = "이름을 입력해 주세요";
    if (password.length < 8) next.password = "비밀번호는 8자 이상이에요";
    if (confirm !== password) next.confirm = "비밀번호가 서로 달라요";
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await api(`/auth/invite/${token}`, { method: "POST", body: JSON.stringify({ name: name.trim(), password }) });
      toast("비밀번호를 설정했어요. 로그인해 주세요.", "success");
      router.push("/staff/login");
    } catch (err) {
      if (err instanceof ApiError && err.status !== 0) toast(err.message, "error");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm pt-4 md:pt-10">
      <h1 className="mb-6 text-title font-semibold tracking-tight">비밀번호 설정</h1>
      {invalid ? (
        <EmptyState title={invalid} action={<ButtonLink href="/" variant="secondary">첫 화면으로</ButtonLink>} />
      ) : !email ? (
        <Card className="flex flex-col gap-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </Card>
      ) : (
        <Card>
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <Field label="이메일">{(id) => <Input id={id} value={email} readOnly className="bg-surface-muted" />}</Field>
            <Field label="이름" required error={errors.name}>
              {(id, d) => <Input id={id} aria-describedby={d} error={errors.name} placeholder="류세아" value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field label="비밀번호" required error={errors.password}>
              {(id, d) => (
                <Input id={id} aria-describedby={d} error={errors.password} type="password" autoComplete="new-password" placeholder="8자 이상" value={password} onChange={(e) => setPassword(e.target.value)} />
              )}
            </Field>
            <Field label="비밀번호 확인" required error={errors.confirm}>
              {(id, d) => (
                <Input id={id} aria-describedby={d} error={errors.confirm} type="password" autoComplete="new-password" placeholder="한 번 더 입력" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              )}
            </Field>
            <Button type="submit" full loading={loading}>
              비밀번호 설정
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
