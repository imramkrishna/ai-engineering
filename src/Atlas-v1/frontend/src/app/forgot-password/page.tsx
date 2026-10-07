"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { authApi } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email."); return; }
    setError("");
    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Failed to send reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
          >
            <img src="/logo.png" alt="Atlas Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Reset password
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              We&apos;ll send a reset link to your email
            </p>
          </div>
        </div>

        <div
          className="p-6 rounded-[var(--radius-xl)] flex flex-col gap-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 size={40} style={{ color: "var(--status-success)" }} />
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Check your email</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  We sent a password reset link to <strong>{email}</strong>
                </p>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="px-4 py-3 rounded-[var(--radius-md)] text-sm"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--status-error)" }}
                >
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftElement={<Mail size={15} />}
                  autoComplete="email"
                  required
                />
                <Button type="submit" variant="primary" isLoading={isLoading} className="w-full justify-center">
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="flex justify-center mt-5">
          <Link href="/login" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
