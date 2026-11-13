"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { clearMemberSession, getMemberSession, onMemberAuthChange, type MemberSession } from "@/lib/member";

const NAV = [
  { href: "/classes", label: "클래스" },
  { href: "/me", label: "내 작품" },
  { href: "/ask", label: "질문하기" },
  { href: "/group", label: "단체 문의" },
];

// 공개 화면 헤더는 수강생의 작품 조회 상태만 표시한다. 직원 인증은 /staff 아래에서만 처리한다.
export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<MemberSession | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setSession(getMemberSession());
    sync();
    return onMemberAuthChange(sync);
  }, []);

  useEffect(() => {
    if (!userOpen) return;
    const close = (e: MouseEvent) => {
      if (!userRef.current?.contains(e.target as Node)) setUserOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setUserOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [userOpen]);

  const logout = () => {
    setUserOpen(false);
    setMenuOpen(false);
    clearMemberSession();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-6 px-5 md:px-6 lg:px-10">
        <Link href="/" className="text-lg font-bold tracking-tight text-primary" onClick={() => setMenuOpen(false)}>
          흙의 온도
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="주요 메뉴">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-base text-ink hover:bg-surface-muted">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!pathname.startsWith("/staff") && (session ? (
            <div ref={userRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={userOpen}
                onClick={() => setUserOpen((v) => !v)}
                className="inline-flex min-h-10 items-center gap-1 rounded-md px-3 text-sm font-semibold text-ink hover:bg-surface-muted"
              >
                {session.name} 님
                <svg className="size-4 text-muted" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {userOpen && (
                <div role="menu" className="hf-anim-fade absolute right-0 mt-2 w-44 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-float">
                  <Link role="menuitem" href="/me" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">
                    내 작품 보기
                  </Link>
                  <button role="menuitem" type="button" onClick={logout} className="block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-surface-muted">
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/me" className={buttonClass("secondary", "sm")}>
              로그인
            </Link>
          ))}

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-ink hover:bg-surface-muted md:hidden"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden>
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="hf-anim-fade border-t border-line bg-bg px-5 py-2 md:hidden" aria-label="주요 메뉴">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center border-b border-line text-base text-ink last:border-0">
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
