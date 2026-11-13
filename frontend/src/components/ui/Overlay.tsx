"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

// 모달·시트 공통: Esc로 닫기, 바깥 누르면 닫기, 열릴 때 안쪽에 포커스, 닫히면 원래 자리로 포커스.
function useOverlay(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  // onClose는 렌더마다 새로 만들어지므로 ref로 들고 있는다. 의존성에 넣으면 글자를 칠 때마다
  // 효과가 다시 돌아 포커스가 패널로 뺏기고(한 글자만 입력됨) 한글 조합도 끊긴다.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open]);
  return panel;
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="닫기" className="-mr-2 inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-ink">
      <svg className="size-5" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode };

// 확인·위험 동작용 가운데 모달.
export function Modal({ open, onClose, title, children, footer }: Props) {
  const panel = useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="hf-anim-fade fixed inset-0 z-50 flex items-center justify-center bg-scrim p-5" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="hf-anim-sheet w-full max-w-md rounded-lg bg-surface p-6 shadow-float outline-none">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <CloseButton onClose={onClose} />
        </div>
        <div className="text-base">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// 휴대폰에서는 아래에서 올라오는 시트, 넓은 화면(768px+)에서는 오른쪽 드로어.
export function Sheet({ open, onClose, title, children, footer }: Props) {
  const panel = useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="hf-anim-fade fixed inset-0 z-50 flex items-end bg-scrim md:items-stretch md:justify-end" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="hf-anim-sheet flex max-h-[90vh] w-full flex-col rounded-t-xl bg-surface shadow-float outline-none md:max-h-none md:w-[440px] md:rounded-none"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <CloseButton onClose={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
