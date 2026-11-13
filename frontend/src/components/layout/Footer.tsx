// 모든 화면 공통 푸터. 실제로 확인된 정보(예약 채널)만 둔다.
export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-1 px-5 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-6 lg:px-10">
        <p className="font-semibold text-ink">흙의 온도 도자기공방</p>
        <p>예약 문의 · 인스타그램 DM, 네이버 예약</p>
      </div>
    </footer>
  );
}
