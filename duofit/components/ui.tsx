"use client";

import React, { useEffect } from "react";
import { XIcon } from "./icons";

export function Card({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-line bg-card ${onClick ? "cursor-pointer active:bg-card2" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`font-mono text-[11px] uppercase tracking-[0.18em] text-muted ${className}`}>{children}</div>;
}

export function Avatar({ name, tint, size = 34 }: { name: string; tint: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-bold"
      style={{ width: size, height: size, background: `${tint}26`, color: tint }}
    >
      {name[0]}
    </span>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
        active ? "bg-accent text-[#241407]" : "bg-card2 text-muted"
      }`}
    >
      {children}
    </button>
  );
}

/** Bottom sheet — the primary logging surface. */
export function Sheet({
  title,
  open,
  onClose,
  children,
  tall,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  tall?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md items-end" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className={`relative w-full rounded-t-3xl border-t border-line bg-card px-5 pb-8 pt-4 ${
          tall ? "h-[92dvh]" : "max-h-[85dvh]"
        } flex flex-col overflow-hidden`}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-cream">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full bg-card2 p-2 text-muted">
            <XIcon size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <SectionLabel className="mb-2">{label}</SectionLabel>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-card2 px-4 py-3 font-mono text-[15px] text-cream outline-none placeholder:text-faint focus:border-accent/60";

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl bg-accent py-3.5 text-[15px] font-semibold text-[#241407] transition-opacity disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ pct, color = "var(--color-accent)" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-card2">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

export function StatTile({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <Card className="flex-1 px-3 py-4 text-center">
      <SectionLabel className="mb-2 !text-[10px]">{label}</SectionLabel>
      <div className="font-mono text-[26px] font-bold leading-none text-cream">
        {value}
        {unit && <span className="ml-1 text-[13px] font-medium text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-2 text-[11px] text-faint">{sub}</div>}
    </Card>
  );
}

/** Confirmation for destructive actions */
export function useConfirmDelete() {
  return (what: string) => window.confirm(`Delete this ${what}? This can't be undone.`);
}
