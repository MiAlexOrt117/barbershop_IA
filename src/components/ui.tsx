"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-sm", className)} {...props} />;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "bg-accent text-slate-950 hover:bg-accent-strong"
      : variant === "ghost"
        ? "bg-transparent text-slate-200 hover:bg-white/6"
        : variant === "danger"
          ? "bg-danger text-white hover:brightness-110"
          : "bg-white/8 text-white hover:bg-white/12";
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-5 py-3 text-base" : "px-4 py-2 text-sm";

  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50", variantClass, sizeClass, className)} {...props} />;
}

export function Badge({ className, tone = "default", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "success" | "warning" | "danger" | "muted" }) {
  const toneClass = {
    default: "bg-white/10 text-white",
    success: "bg-accent/20 text-accent",
    warning: "bg-accentWarm/20 text-accentWarm",
    danger: "bg-danger/20 text-danger",
    muted: "bg-white/6 text-slate-300"
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", toneClass, className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-accent/50", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-[110px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-accent/50", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none focus:border-accent/50", className)} {...props} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", className)} {...props} />;
}

export function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="space-y-1">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{eyebrow}</p> : null}
      <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
      {subtitle ? <p className="max-w-2xl text-sm leading-6 text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

export function Modal({ open, title, description, children, onClose }: { open: boolean; title: string; description?: string; children?: ReactNode; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-panel p-6 shadow-glow">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}