"use client";

import { useEffect, useState } from "react";
import { onSlow, onToast, type ToastMessage } from "@/lib/notify";

const toneClass = {
  info: "bg-ink text-white",
  success: "bg-success text-white",
  error: "bg-error text-white",
};

// 화면 아래 토스트(4초 뒤 사라짐) + 위쪽 "연결이 느려요" 알림. layout 에 한 번만 둔다.
export function Toaster() {
  const [items, setItems] = useState<ToastMessage[]>([]);
  const [slow, setSlow] = useState(0);

  useEffect(() => {
    const offToast = onToast((m) => {
      setItems((prev) => [...prev.filter((p) => p.text !== m.text), m].slice(-3));
      setTimeout(() => setItems((prev) => prev.filter((p) => p.id !== m.id)), 4000);
    });
    const offSlow = onSlow(setSlow);
    return () => {
      offToast();
      offSlow();
    };
  }, []);

  return (
    <>
      {slow > 0 && (
        <div role="status" className="hf-anim-fade fixed inset-x-0 top-0 z-[60] bg-warning px-4 py-1.5 text-center text-sm font-semibold text-white">
          연결이 느려요
        </div>
      )}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {items.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={`hf-anim-sheet pointer-events-auto w-full max-w-sm rounded-md px-4 py-3 text-center text-sm font-semibold shadow-float ${toneClass[t.tone]}`}>
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
