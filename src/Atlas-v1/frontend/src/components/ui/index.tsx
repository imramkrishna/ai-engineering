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
  primary:   "atlas-btn-primary",
  secondary: "atlas-btn-secondary",
  ghost:     "atlas-btn-ghost",
  danger:    "atlas-btn-danger",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "py-[5px] px-2.5 text-[12.5px] gap-1.5 h-7",
  md: "py-[7px] px-3.5 text-[13.5px] h-8",
  lg: "py-2.5 px-5 text-sm h-10 gap-2",
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
        <Spinner size={size === "lg" ? 15 : 13} />
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
        <label
          htmlFor={inputId}
          className="text-xs font-medium"
          style={{ color: "var(--text-secondary)", letterSpacing: "-0.01em" }}
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftElement && (
          <span
            className="absolute left-3 flex items-center pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          >
            {leftElement}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            "atlas-input",
            leftElement && "!pl-9",
            rightElement && "!pr-9",
            error && "!border-[var(--status-error)] focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.1)]",
            className
          )}
          {...props}
        />
        {rightElement && (
          <span
            className="absolute right-3 flex items-center"
            style={{ color: "var(--text-muted)" }}
          >
            {rightElement}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--status-error)" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</p>
      )}
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
        <label
          htmlFor={inputId}
          className="text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn("atlas-input resize-none", error && "!border-[var(--status-error)]", className)}
        {...props}
      />
      {error && (
        <p className="text-xs" style={{ color: "var(--status-error)" }}>{error}</p>
      )}
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
      <circle
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="32"
        strokeDashoffset="12"
        strokeLinecap="round"
        opacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
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
        <span
          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: "var(--status-info)" }}
        />
      )}
      {variant === "completed" && (
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="2,6 5,9 10,3" />
        </svg>
      )}
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────
export function Card({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("atlas-card", onClick && "cursor-pointer hoverable", className)}
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
    <div className="flex flex-col items-center justify-center gap-4 py-20 px-6 text-center animate-fade-in">
      {icon && (
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-muted)",
          }}
        >
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <h3
          className="font-medium text-sm"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
        >
          {title}
        </h3>
        {description && (
          <p
            className="text-[13px] max-w-[280px] leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            {description}
          </p>
        )}
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
    <div className="flex flex-col items-center justify-center gap-4 py-20 px-6 text-center">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{
          background: "var(--status-error-bg)",
          border: "1px solid rgba(239,68,68,0.2)",
          color: "var(--status-error)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{title}</h3>
        {description && (
          <p className="text-[13px] max-w-[280px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {description}
          </p>
        )}
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
export function Toggle({ checked, onChange, label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => e.key === "Enter" && onChange(!checked)}
        className="relative flex-shrink-0 rounded-full transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
        style={{
          width: 36,
          height: 20,
          background: checked ? "var(--accent-primary)" : "var(--border-strong)",
          boxShadow: checked ? "0 0 8px var(--accent-primary-glow)" : "none",
        }}
      >
        <span
          className="absolute rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{
            width: 14,
            height: 14,
            top: 3,
            left: 3,
            transform: checked ? "translateX(16px)" : "translateX(0)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </button>
      {label && (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
      )}
    </label>
  );
}

// ─── Divider ──────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return (
    <hr
      className={cn("border-0 border-t", className)}
      style={{ borderColor: "var(--border-subtle)" }}
    />
  );
}

// ─── Tooltip ──────────────────────────────────────────────────
export function Tooltip({ content, children, side = "top" }: {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const sideStyle: Record<string, React.CSSProperties> = {
    top:    { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6 },
    bottom: { top: "100%",  left: "50%", transform: "translateX(-50%)", marginTop: 6 },
    left:   { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: 6 },
    right:  { left: "100%",  top: "50%", transform: "translateY(-50%)", marginLeft: 6 },
  };

  return (
    <div className="relative group inline-flex">
      {children}
      <div
        className="absolute px-2 py-1 rounded-md text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-[100]"
        style={{
          ...sideStyle[side],
          background: "var(--bg-elevated)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-md)",
          fontSize: "12px",
          fontWeight: 450,
          letterSpacing: "-0.01em",
        }}
      >
        {content}
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold flex-shrink-0 select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: "var(--accent-primary-muted)",
        border: "1px solid var(--accent-primary-border)",
        color: "var(--accent-primary)",
        letterSpacing: "-0.02em",
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
    <div
      className="flex items-start justify-between gap-4 pb-5"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="flex flex-col gap-0.5">
        <h1
          className="text-[18px] font-semibold"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1.2 }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="text-[13px] mt-0.5"
            style={{ color: "var(--text-muted)", letterSpacing: "-0.01em" }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
