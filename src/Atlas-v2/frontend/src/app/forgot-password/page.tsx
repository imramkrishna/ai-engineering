"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { Button, Input, Spinner } from "@/components/ui";
import { authApi } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
    <div className="auth-page-root">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-grid-overlay" />
      </div>

      <div className={`auth-content ${mounted ? "auth-content-visible" : ""}`}>
        {/* Logo */}
        <div className="auth-logo-group">
          <div className="auth-logo-ring">
            <div className="auth-logo-inner">
              <img src="/logo.png" alt="Atlas" className="w-7 h-7 object-contain" />
            </div>
          </div>
          <div className="auth-wordmark">
            <span className="auth-wordmark-name">Atlas</span>
            <span className="auth-wordmark-badge">
              <Sparkles size={10} />
              AI Workspace
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="auth-card">
          {sent ? (
            /* ── Success State ── */
            <div className="fp-success-state">
              <div className="fp-success-icon">
                <CheckCircle2 size={32} color="var(--status-success)" />
              </div>
              <div className="fp-success-text">
                <p className="fp-success-title">Check your inbox</p>
                <p className="fp-success-sub">
                  We sent a password reset link to{" "}
                  <strong style={{ color: "var(--text-primary)" }}>{email}</strong>
                </p>
              </div>
              <p className="fp-success-hint">
                Didn&apos;t receive it?{" "}
                <button
                  onClick={() => { setSent(false); setEmail(""); }}
                  className="fp-resend-btn"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            /* ── Form State ── */
            <>
              <div className="auth-card-header">
                <h1 className="auth-card-title">Reset your password</h1>
                <p className="auth-card-subtitle">
                  Enter your email and we&apos;ll send a reset link
                </p>
              </div>

              <div className="auth-divider" />

              {error && (
                <div className="auth-error-banner" role="alert">
                  <div className="auth-error-dot" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <Input
                  id="forgot-email"
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftElement={<Mail size={15} />}
                  autoComplete="email"
                  required
                />
                <Button
                  id="forgot-submit"
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  className="auth-submit-btn"
                >
                  {!isLoading && "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="flex justify-center">
          <Link href="/login" className="auth-back-link">
            <ArrowLeft size={14} />
            Back to login
          </Link>
        </div>
      </div>

      <style>{`
        .auth-page-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
          background: var(--bg-base);
        }
        .auth-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .auth-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
          animation: auth-orb-float 8s ease-in-out infinite;
        }
        .auth-orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #20b2aa 0%, transparent 70%);
          top: -150px; left: -100px;
        }
        .auth-orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #3b82f6 0%, transparent 70%);
          bottom: -100px; right: -80px;
          animation-delay: -3s;
        }
        @keyframes auth-orb-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.04); }
        }
        .auth-grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .auth-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 500ms ease, transform 500ms ease;
        }
        .auth-content-visible { opacity: 1; transform: translateY(0); }
        .auth-logo-group { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .auth-logo-ring {
          width: 60px; height: 60px;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(32,178,170,0.2), rgba(59,130,246,0.1));
          border: 1px solid rgba(32,178,170,0.3);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 30px rgba(32,178,170,0.2), 0 0 60px rgba(32,178,170,0.05);
          animation: auth-logo-pulse 3s ease-in-out infinite;
        }
        .auth-logo-inner {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: rgba(32,178,170,0.08);
          display: flex; align-items: center; justify-content: center;
        }
        @keyframes auth-logo-pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(32,178,170,0.2), 0 0 60px rgba(32,178,170,0.05); }
          50% { box-shadow: 0 0 40px rgba(32,178,170,0.35), 0 0 80px rgba(32,178,170,0.1); }
        }
        .auth-wordmark { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .auth-wordmark-name { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: var(--text-primary); }
        .auth-wordmark-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
          color: var(--accent-primary); background: var(--accent-primary-muted);
          border: 1px solid var(--accent-primary-border);
          padding: 2px 8px; border-radius: 999px;
        }
        .auth-card {
          width: 100%;
          background: rgba(26,26,26,0.7);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: 0 0 0 1px rgba(32,178,170,0.04), 0 20px 60px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04) inset;
        }
        .auth-card-header { display: flex; flex-direction: column; gap: 4px; }
        .auth-card-title { font-size: 22px; font-weight: 700; letter-spacing: -0.4px; color: var(--text-primary); margin: 0; }
        .auth-card-subtitle { font-size: 13.5px; color: var(--text-muted); margin: 0; }
        .auth-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.06) 60%, transparent);
        }
        .auth-error-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-radius: 12px;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          color: #f87171; font-size: 13px;
          animation: auth-shake 400ms ease;
        }
        @keyframes auth-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .auth-error-dot { width: 6px; height: 6px; border-radius: 50%; background: #f87171; flex-shrink: 0; }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .auth-submit-btn {
          width: 100% !important; justify-content: center !important;
          height: 42px; font-size: 14px !important; font-weight: 600 !important;
          border-radius: 12px !important;
          background: linear-gradient(135deg, var(--accent-primary) 0%, #1a9e96 100%) !important;
          box-shadow: 0 4px 20px rgba(32,178,170,0.3) !important;
          transition: all 200ms ease !important;
        }
        .auth-submit-btn:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 28px rgba(32,178,170,0.4) !important;
        }

        /* Success state */
        .fp-success-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 8px 0;
          animation: auth-fade-up 400ms ease both;
        }
        @keyframes auth-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fp-success-icon {
          width: 64px; height: 64px;
          border-radius: 20px;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.2);
          display: flex; align-items: center; justify-content: center;
        }
        .fp-success-text { text-align: center; display: flex; flex-direction: column; gap: 6px; }
        .fp-success-title { font-size: 17px; font-weight: 700; color: var(--text-primary); }
        .fp-success-sub { font-size: 13px; color: var(--text-muted); line-height: 1.5; }
        .fp-success-hint { font-size: 12px; color: var(--text-muted); }
        .fp-resend-btn {
          background: none; border: none; cursor: pointer;
          color: var(--accent-primary); font-size: 12px; font-weight: 500;
          padding: 0; transition: color 150ms ease;
        }
        .fp-resend-btn:hover { color: var(--accent-primary-hover); }

        .auth-back-link {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; color: var(--text-muted);
          text-decoration: none;
          transition: color 150ms ease;
        }
        .auth-back-link:hover { color: var(--text-primary); }
      `}</style>
    </div>
  );
}
