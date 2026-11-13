import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md border text-center font-semibold transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-primary text-white hover:bg-primary-hover",
  secondary: "border-primary bg-transparent text-primary hover:bg-primary-subtle",
  tertiary: "border-transparent bg-transparent text-primary underline underline-offset-4 hover:text-primary-hover",
  destructive: "border-error bg-surface text-error hover:bg-error-subtle",
};
const sizes: Record<Size, string> = {
  md: "min-h-12 px-5 text-base",
  sm: "min-h-10 px-4 text-sm",
};

export function buttonClass(variant: ButtonVariant = "primary", size: Size = "md", full = false) {
  return `${base} ${variants[variant]} ${sizes[size]} ${full ? "w-full" : ""}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
};

// 로딩 중에는 다시 누를 수 없고 "처리 중…"을 보여 준다.
export function Button({ variant = "primary", size = "md", full, loading, children, className = "", disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClass(variant, size, full)} ${className}`}
    >
      {loading ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          처리 중…
        </>
      ) : (
        children
      )}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: Size; full?: boolean };

export function ButtonLink({ variant = "primary", size = "md", full, className = "", ...rest }: ButtonLinkProps) {
  return <Link {...rest} className={`${buttonClass(variant, size, full)} ${className}`} />;
}
