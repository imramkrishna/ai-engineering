"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ─── Button ───────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "atlas-btn-primary",
  secondary: "atlas-btn-secondary",
  ghost: "atlas-btn-ghost",
  danger: "atlas-btn-danger",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "py-1.5 px-3 text-xs gap-1.5",
  md: "",
  lg: "py-3 px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", isLoading, leftIcon, rightIcon, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn("atlas-btn", variantClasses[variant], sizeClasses[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Spinner size={size === "lg" ? 18 : 14} />
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  )
);
Button.displayName = "Button";

// ─── Input ────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function Input({ label, error, hint, leftElement, rightElement, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftElement && (
          <span className="absolute left-3 flex items-center" style={{ color: "var(--text-muted)" }}>
            {leftElement}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            "atlas-input",
            leftElement && "!pl-10",
            rightElement && "!pr-10",
            error && "!border-[var(--status-error)]",
            className
          )}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3 flex items-center" style={{ color: "var(--text-muted)" }}>
            {rightElement}
          </span>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: "var(--status-error)" }}>{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn("atlas-input resize-none", error && "border-[var(--status-error)]", className)}
        {...props}
      />
      {error && <p className="text-xs" style={{ color: "var(--status-error)" }}>{error}</p>}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("animate-spin", className)}
      style={{ color: "currentColor" }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  );
}

// ─── Badge ────────────────────────────────────────────────────
type BadgeVariant = "completed" | "processing" | "failed" | "queued" | "default";

export function Badge({ variant = "default", children, className }: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("badge", variant !== "default" && `badge-${variant}`, className)}>
      {variant === "processing" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      )}
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────
export function Card({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("atlas-card", onClick && "cursor-pointer", className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("skeleton", className)} style={style} />;
}

// ─── Empty State ──────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center animate-fade-in">
      {icon && (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
        >
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{title}</h3>
        {description && <p className="text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────
export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--status-error)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{title}</h3>
        {description && <p className="text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className="relative w-10 h-5 rounded-full transition-colors duration-200"
        style={{
          background: checked ? "var(--accent-primary)" : "var(--border-default)",
        }}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onChange(!checked)}
      >
        <div
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
          style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
        />
      </div>
      {label && <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>}
    </label>
  );
}

// ─── Divider ──────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t", className)} style={{ borderColor: "var(--border-subtle)" }} />;
}

// ─── Tooltip ──────────────────────────────────────────────────
export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
        style={{ background: "var(--bg-active)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}>
        {content}
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: "var(--accent-primary-muted)",
        border: "1px solid var(--accent-primary-border)",
        color: "var(--accent-primary)",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────
export function PageHeader({ title, description, action }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 pb-6" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h1>
        {description && <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}
