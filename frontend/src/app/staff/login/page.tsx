"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { getSession, saveSession, type StaffRole } from "@/lib/auth";
import { toast } from "@/lib/notify";

type LoginResponse = { token: string; staff: { name: string; email: string; role: StaffRole } };

// 로컬 개발에서만 보이는 빠른 로그인 (시드 계정, 배포 빌드에서는 렌더링하지 않음)
const QUICK_LOGIN = process.env.NODE_ENV === "development";
const QUICK_ACCOUNTS = [
  { label: "대표로 로그인", email: "admin@naver.com" },
  { label: "강사로 로그인", email: "test1@naver.com" },
];
const QUICK_PASSWORD = "12341234";

// STF-01 직원 로그인
export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 이미 로그인한 직원은 바로 직원 화면으로
  useEffect(() => {
    if (getSession()) router.replace("/staff");
  }, [router]);

  const login = async (id: string, pw: string) => {
    if (!id.trim()) return toast("이메일을 입력해 주세요", "error");
    if (!pw) return toast("비밀번호를 입력해 주세요", "error");
    setLoading(true);
    try {
      const res = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: id.trim(), password: pw }),
      });
      saveSession({ token: res.token, ...res.staff });
      router.push("/staff");
    } catch (e) {
      // 연결 실패(status 0)는 api()가 이미 토스트로 알렸다.
      if (e instanceof ApiError && e.status !== 0) {
        toast(e.status === 401 ? "이메일 또는 비밀번호가 맞지 않아요" : "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.", "error");
      }
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <div className="mx-auto w-full max-w-sm pt-4 md:pt-10">
      <h1 className="mb-6 text-title font-semibold tracking-tight">직원 로그인</h1>
      <Card>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <Field label="이메일">
            {(id) => (
              <Input id={id} type="email" autoComplete="username" placeholder="admin@naver.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            )}
          </Field>
          <Field label="비밀번호">
            {(id) => (
              <Input id={id} type="password" autoComplete="current-password" placeholder="비밀번호 8자 이상" value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
          </Field>
          <Button type="submit" full loading={loading}>
            로그인
          </Button>
        </form>
      </Card>

      {QUICK_LOGIN && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {QUICK_ACCOUNTS.map((a) => (
            <Button key={a.email} variant="secondary" size="sm" disabled={loading} onClick={() => login(a.email, QUICK_PASSWORD)}>
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
