"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button, Input, Spinner } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect already-authenticated users
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="auth-page-root">
      {/* Animated background */}
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
        <div className="auth-grid-overlay" />
      </div>

      {/* Content */}
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
          {/* Card header */}
          <div className="auth-card-header">
            <h1 className="auth-card-title">Welcome back</h1>
            <p className="auth-card-subtitle">Sign in to your workspace to continue</p>
          </div>

          {/* Divider */}
          <div className="auth-divider" />

          {/* Error */}
          {error && (
            <div className="auth-error-banner" role="alert">
              <div className="auth-error-dot" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field-group">
              <Input
                id="login-email"
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftElement={<Mail size={15} />}
                autoComplete="email"
                required
              />
              <div>
                <Input
                  id="login-password"
                  label="Password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftElement={<Lock size={15} />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      aria-label={showPass ? "Hide password" : "Show password"}
                      className="auth-toggle-pass"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                  autoComplete="current-password"
                  required
                />
                <div className="auth-forgot-row">
                  <Link href="/forgot-password" className="auth-forgot-link">
                    Forgot password?
                  </Link>
                </div>
              </div>
            </div>

            <Button
              id="login-submit"
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="auth-submit-btn"
            >
              {!isLoading && (
                <>
                  Sign in
                  <ArrowRight size={15} className="auth-btn-arrow" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="auth-footer-text">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="auth-footer-link">
            Create one free
          </Link>
        </p>

        {/* Trust indicators */}
        <div className="auth-trust-row">
          {["End-to-end encrypted", "Session-based auth", "No data sold"].map((t) => (
            <span key={t} className="auth-trust-item">
              <span className="auth-trust-dot" />
              {t}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        /* ── Auth Page Root ── */
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

        /* ── Animated Background ── */
        .auth-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

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
          animation-delay: 0s;
        }

        .auth-orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #3b82f6 0%, transparent 70%);
          bottom: -100px; right: -80px;
          animation-delay: -3s;
        }

        .auth-orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
          top: 50%; left: 60%;
          animation-delay: -5s;
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

        /* ── Content ── */
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
        .auth-content-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── Logo ── */
        .auth-logo-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .auth-logo-ring {
          width: 60px; height: 60px;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(32,178,170,0.2), rgba(59,130,246,0.1));
          border: 1px solid rgba(32,178,170,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px rgba(32,178,170,0.2), 0 0 60px rgba(32,178,170,0.05);
          animation: auth-logo-pulse 3s ease-in-out infinite;
        }

        .auth-logo-inner {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: rgba(32,178,170,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes auth-logo-pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(32,178,170,0.2), 0 0 60px rgba(32,178,170,0.05); }
          50% { box-shadow: 0 0 40px rgba(32,178,170,0.35), 0 0 80px rgba(32,178,170,0.1); }
        }

        .auth-wordmark {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .auth-wordmark-name {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--text-primary);
        }

        .auth-wordmark-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--accent-primary);
          background: var(--accent-primary-muted);
          border: 1px solid var(--accent-primary-border);
          padding: 2px 8px;
          border-radius: 999px;
        }

        /* ── Card ── */
        .auth-card {
          width: 100%;
          background: rgba(26, 26, 26, 0.7);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow:
            0 0 0 1px rgba(32,178,170,0.04),
            0 20px 60px rgba(0,0,0,0.5),
            0 1px 0 rgba(255,255,255,0.04) inset;
        }

        .auth-card-header { display: flex; flex-direction: column; gap: 4px; }

        .auth-card-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.4px;
          color: var(--text-primary);
          margin: 0;
        }

        .auth-card-subtitle {
          font-size: 13.5px;
          color: var(--text-muted);
          margin: 0;
        }

        .auth-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.06) 60%, transparent);
        }

        /* ── Error ── */
        .auth-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
          font-size: 13px;
          animation: auth-shake 400ms ease;
        }

        @keyframes auth-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }

        .auth-error-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #f87171;
          flex-shrink: 0;
        }

        /* ── Form ── */
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .auth-field-group { display: flex; flex-direction: column; gap: 14px; }

        .auth-forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 6px;
        }

        .auth-forgot-link {
          font-size: 12px;
          color: var(--text-muted);
          text-decoration: none;
          transition: color 150ms ease;
        }
        .auth-forgot-link:hover { color: var(--accent-primary); }

        .auth-toggle-pass {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: color 150ms ease;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .auth-toggle-pass:hover { color: var(--text-primary); }

        /* ── Submit Button ── */
        .auth-submit-btn {
          width: 100% !important;
          justify-content: center !important;
          height: 42px;
          font-size: 14px !important;
          font-weight: 600 !important;
          border-radius: 12px !important;
          background: linear-gradient(135deg, var(--accent-primary) 0%, #1a9e96 100%) !important;
          box-shadow: 0 4px 20px rgba(32,178,170,0.3) !important;
          transition: all 200ms ease !important;
          position: relative;
          overflow: hidden;
        }
        .auth-submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%);
          opacity: 0;
          transition: opacity 200ms ease;
        }
        .auth-submit-btn:hover::before { opacity: 1; }
        .auth-submit-btn:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 28px rgba(32,178,170,0.4) !important;
        }
        .auth-submit-btn:active { transform: translateY(0) !important; }

        .auth-btn-arrow {
          transition: transform 200ms ease;
        }
        .auth-submit-btn:hover .auth-btn-arrow { transform: translateX(2px); }

        /* ── Footer ── */
        .auth-footer-text {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          margin: 0;
        }

        .auth-footer-link {
          color: var(--accent-primary);
          font-weight: 500;
          text-decoration: none;
          transition: color 150ms ease;
        }
        .auth-footer-link:hover { color: var(--accent-primary-hover); text-decoration: underline; }

        /* ── Trust row ── */
        .auth-trust-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .auth-trust-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--text-disabled);
          letter-spacing: 0.02em;
        }

        .auth-trust-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: var(--accent-primary);
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
