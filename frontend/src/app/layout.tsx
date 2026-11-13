import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "흙의 온도 도자기공방",
  description: "클래스 신청, 내 작품 진행 상황, 흙·유약 질문",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-8 md:px-6 md:py-10 lg:px-10">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
