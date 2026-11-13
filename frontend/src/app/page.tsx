import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

const SHORTCUTS = [
  { href: "/me", title: "내 작품 보기" },
  { href: "/ask", title: "흙·유약 질문하기" },
  { href: "/group", title: "단체 클래스 문의" },
];

// PUB-01 홈
export default function Home() {
  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <section className="flex flex-col items-start gap-6 pt-4 md:pt-10">
        <h1 className="text-title font-semibold tracking-tight text-ink">
          흙을 만지는 시간,
          <br />
          나만의 그릇이 되는 순간
        </h1>
        <ButtonLink href="/classes">클래스 둘러보기</ButtonLink>
      </section>

      <section className="grid gap-4 md:grid-cols-3 md:gap-6" aria-label="바로가기">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-center justify-between rounded-lg border border-line bg-surface p-6 transition-colors duration-150 hover:border-primary"
          >
            <span className="text-lg font-semibold text-ink">{s.title}</span>
            <svg className="size-5 text-muted transition-colors group-hover:text-primary" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M7.5 4.5L13 10l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
          </Link>
        ))}
      </section>
    </div>
  );
}
