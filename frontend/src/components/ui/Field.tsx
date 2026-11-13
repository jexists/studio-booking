"use client";

import { Children, isValidElement, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes, KeyboardEvent, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const control =
  "w-full rounded-md border bg-surface px-4 text-base text-ink placeholder:text-muted transition-colors duration-150 focus:border-primary focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-focus";

function border(error?: string) {
  return error ? "border-error" : "border-line";
}

type FieldProps = {
  label: string;
  required?: boolean;
  // 오류 문구는 여러 칸에서 오류가 나는 폼에서만 넘긴다. 나머지는 토스트로 알린다.
  error?: string;
  children: (id: string, describedBy?: string) => ReactNode;
};

// 라벨 + 입력. 입력 아래 안내 문구는 두지 않고(placeholder 사용), 오류일 때만 표시한다.
export function Field({ label, required, error, children }: FieldProps) {
  const id = useId();
  const errId = `${id}-error`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-error" aria-hidden>*</span>}
      </label>
      {children(id, error ? errId : undefined)}
      {error && (
        <p id={errId} className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}

type WithError = { error?: string };

export function Input({ error, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & WithError) {
  return <input {...rest} aria-invalid={error ? true : undefined} className={`${control} ${border(error)} h-12 ${className}`} />;
}

export function Textarea({ error, className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & WithError) {
  return (
    <textarea
      rows={4}
      {...rest}
      aria-invalid={error ? true : undefined}
      className={`${control} ${border(error)} py-3 ${className}`}
    />
  );
}

// 입력창과 같은 모양의 셀렉트. 브라우저 기본 목록 대신 직접 그린 목록을 쓴다.
// 사용법은 기존 <select>와 같다: <option>을 자식으로 넘기고 onChange(e)에서 e.target.value를 읽는다.
type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & WithError & { children: ReactNode };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

export function Select({ error, className = "", children, value, onChange, id, disabled, "aria-describedby": describedBy }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const listId = useId();

  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((el) => {
      const p = el.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
      return { value: String(p.value ?? textOf(p.children)), label: textOf(p.children), disabled: !!p.disabled };
    });
  const current = options.findIndex((o) => o.value === String(value));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const show = () => {
    const r = wrap.current?.getBoundingClientRect();
    const need = Math.min(options.length, 6) * 44 + 12;
    if (r) setUp(window.innerHeight - r.bottom < need && r.top > window.innerHeight - r.bottom);
    setActive(Math.max(current, 0));
    setOpen(true);
  };

  const choose = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    setOpen(false);
    if (o.value !== String(value)) {
      const target = { value: o.value, id } as unknown as EventTarget & HTMLSelectElement;
      onChange?.({ target, currentTarget: target } as ChangeEvent<HTMLSelectElement>);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.nativeEvent.stopPropagation(); // 시트·모달이 같이 닫히지 않게
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={`${control} ${border(error)} flex h-12 items-center pr-10 text-left disabled:opacity-60 ${open ? "border-primary" : ""} ${className}`}
      >
        <span className="truncate">{options[current]?.label ?? ""}</span>
      </button>
      <svg
        className={`pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className={`absolute inset-x-0 z-20 max-h-64 overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-float ${up ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={i === current}
              aria-disabled={o.disabled || undefined}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              className={`flex min-h-11 cursor-pointer items-center justify-between rounded-sm px-3 text-base ${
                o.disabled ? "cursor-not-allowed text-muted opacity-60" : i === active ? "bg-primary-subtle" : ""
              } ${i === current ? "font-semibold text-primary" : "text-ink"}`}
            >
              <span>{o.label}</span>
              {i === current && (
                <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 칸 어디를 눌러도 달력이 열리는 날짜 입력.
export function DateInput({ error, className = "", type = "date", ...rest }: InputHTMLAttributes<HTMLInputElement> & WithError) {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => {
    try {
      ref.current?.showPicker?.();
    } catch {
      // 일부 브라우저는 사용자 동작이 아니면 막는다. 그때는 기본 동작에 맡긴다.
    }
  };
  return (
    <input
      ref={ref}
      type={type}
      {...rest}
      onClick={(e) => {
        open();
        rest.onClick?.(e);
      }}
      aria-invalid={error ? true : undefined}
      className={`${control} ${border(error)} tabular h-12 cursor-pointer ${className}`}
    />
  );
}
