"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { getSession, onAuthChange, saveSession, type StaffSession } from "@/lib/auth";

type Item = { href: string; label: string; ownerOnly?: boolean; tab?: boolean };

// 직원 메뉴. 휴대폰 하단 탭에는 수업 중 자주 쓰는 것만(tab), 나머지는 "더보기".
const MENU: Item[] = [
  { href: "/staff", label: "오늘", tab: true },
  { href: "/staff/classes", label: "일정", tab: true },
  { href: "/staff/works", label: "작품", tab: true },
  { href: "/staff/makeups", label: "보강", tab: true },
  { href: "/ask", label: "자료 질문" },
  { href: "/staff/documents", label: "자료" },
  { href: "/staff/inquiries", label: "단체 문의" },
  { href: "/staff/members", label: "직원", ownerOnly: true },
];

const PUBLIC_STAFF_PATHS = ["/staff/login", "/staff/invite"];

function isActive(path: string, href: string) {
  return href === "/staff" ? path === "/staff" : path.startsWith(href);
}

// /staff 아래 화면 공통: 로그인 확인 + PC 왼쪽 메뉴 / 휴대폰 하단 탭.
export function StaffShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_STAFF_PATHS.some((p) => path.startsWith(p));
  const [session, setSession] = useState<StaffSession | null>(null);
  const [checked, setChecked] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (isPublic) return;
    const s = getSession();
    if (!s) {
      router.replace("/staff/login");
      return;
    }
    setSession(s);
    setChecked(true);
    // 서버에서 토큰이 아직 유효한지 확인 (만료면 api()가 로그인 화면으로 보낸다)
    api<{ name: string; email: string; role: StaffSession["role"] }>("/auth/me")
      .then((me) => {
        if (me.name !== s.name || me.role !== s.role) saveSession({ ...s, ...me });
      })
      .catch(() => undefined);
    return onAuthChange(() => {
      const next = getSession();
      if (!next) router.replace("/");
      setSession(next);
    });
  }, [isPublic, router]);

  useEffect(() => setMoreOpen(false), [path]);

  if (isPublic) return <>{children}</>;
  if (!checked || !session) return null;

  const items = MENU.filter((m) => !m.ownerOnly || session.role === "OWNER");
  const tabs = items.filter((m) => m.tab);
  const more = items.filter((m) => !m.tab);

  return (
    <div className="flex gap-10 pb-20 md:pb-0">
      <nav className="hidden w-48 shrink-0 md:block" aria-label="직원 메뉴">
        <ul className="sticky top-24 flex flex-col gap-1">
          {items.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                aria-current={isActive(path, m.href) ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-md px-3 text-base ${isActive(path, m.href) ? "bg-primary-subtle font-semibold text-primary" : "text-ink hover:bg-surface-muted"}`}
              >
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1">{children}</div>

      {moreOpen && (
        <div className="hf-anim-fade fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface px-5 py-2 shadow-float md:hidden">
          {more.map((m) => (
            <Link key={m.href} href={m.href} className="flex min-h-12 items-center border-b border-line text-base last:border-0">
              {m.label}
            </Link>
          ))}
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="직원 메뉴">
        {tabs.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            aria-current={isActive(path, m.href) ? "page" : undefined}
            className={`flex items-center justify-center text-sm ${isActive(path, m.href) ? "font-semibold text-primary" : "text-muted"}`}
          >
            {m.label}
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
          className={`text-sm ${moreOpen || more.some((m) => isActive(path, m.href)) ? "font-semibold text-primary" : "text-muted"}`}
        >
          더보기
        </button>
      </nav>
    </div>
  );
}
