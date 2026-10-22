"use client";

import Link from "next/link";
import { ReactNode } from "react";

/* ---------- Icons (inline SVG, no deps) ---------- */

export function PawIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <g fill="currentColor">
        <ellipse cx="6"  cy="9"  rx="1.6" ry="2.2" />
        <ellipse cx="10" cy="6"  rx="1.6" ry="2.2" />
        <ellipse cx="14" cy="6"  rx="1.6" ry="2.2" />
        <ellipse cx="18" cy="9"  rx="1.6" ry="2.2" />
        <path d="M12 11c-3.3 0-6 2.4-6 5.1 0 1.6 1.3 2.9 2.9 2.9.9 0 1.6-.3 2.3-.8.5-.4 1.1-.6 1.7-.6s1.2.2 1.7.6c.7.5 1.4.8 2.3.8 1.6 0 2.9-1.3 2.9-2.9 0-2.7-2.7-5.1-6-5.1z" />
      </g>
    </svg>
  );
}

export function CameraIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 8a2 2 0 0 1 2-2h2.2l1.1-1.6A2 2 0 0 1 11 3.6h2a2 2 0 0 1 1.7.9L15.8 6H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="13"
        r="3.4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function BackIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M15 19l-7-7 7-7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- Layout chrome ---------- */

export function Header({
  title,
  back,
  right,
}: {
  title?: string;
  back?: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-paper bg-bone/90 px-5 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        {back && (
          <Link
            href={back}
            className="rounded-full p-1 text-midnight/70 hover:text-midnight"
            aria-label="Back"
          >
            <BackIcon />
          </Link>
        )}
        {title && (
          <h1 className="text-base font-medium tracking-tight">{title}</h1>
        )}
      </div>
      <div>{right}</div>
    </header>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif text-lg font-medium tracking-tightest ${className}`}>
      Woof<span className="italic">walk</span>
    </span>
  );
}

/* ---------- Buttons ---------- */

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  full = true,
  as,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  full?: boolean;
  as?: "button" | "link";
  href?: string;
}) {
  const base =
    "inline-flex items-center justify-center px-5 py-3.5 text-[15px] font-medium transition active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed select-none";
  const variants = {
    primary:
      "bg-midnight text-bone hover:bg-night rounded-full",
    secondary:
      "bg-transparent text-midnight border border-midnight hover:bg-midnight hover:text-bone rounded-full",
    ghost:
      "bg-transparent text-midnight/70 hover:text-midnight rounded-full",
    danger:
      "bg-clay text-bone hover:brightness-110 rounded-full",
  };
  const cls = `${base} ${variants[variant]} ${full ? "w-full" : ""}`;

  if (as === "link" && href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

/* ---------- Form ---------- */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-stone/80">{hint}</span>}
    </label>
  );
}

// A boxed input (kept for forms where paper-input looks too sparse)
export const inputCls =
  "w-full rounded-lg border border-chalk bg-bone px-3 py-3 text-[15px] text-midnight placeholder:text-stone/60 focus:border-midnight focus:outline-none transition";

/* ---------- Cards ---------- */

export function Card({
  children,
  className = "",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "dark" | "accent" | "warn";
}) {
  const tones = {
    default: "bg-bone border border-paper",
    dark: "bg-midnight text-bone border border-midnight",
    accent: "bg-lime/30 border border-lime",
    warn: "bg-paper border border-chalk",
  };
  return (
    <div className={`rounded-2xl p-5 ${tones[tone]} ${className}`}>
      {children}
    </div>
  );
}

/* ---------- Status pill ---------- */

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warn" | "ok" | "info" | "accent";
}) {
  const tones = {
    neutral: "bg-paper text-midnight/70",
    warn: "bg-paper text-amber2",
    ok: "bg-paper text-emerald2",
    info: "bg-midnight text-bone",
    accent: "bg-lime text-midnight",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ---------- Empty state ---------- */

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-chalk bg-bone p-8 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-paper text-midnight/60">
        <PawIcon className="h-5 w-5" />
      </div>
      <h3 className="font-serif text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-stone">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- Hairline between content sections ---------- */

export function HR() {
  return <hr className="my-6 border-paper" />;
}
