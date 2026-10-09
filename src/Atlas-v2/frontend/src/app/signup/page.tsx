"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button, Input, Spinner } from "@/components/ui";

const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains uppercase", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Contains a number", test: (p: string) => /\d/.test(p) },
];

// Password strength meter
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const passed = PASSWORD_REQUIREMENTS.filter((r) => r.test(password)).length;
  const pct = (passed / PASSWORD_REQUIREMENTS.length) * 100;
  const color = passed === 3 ? "#22c55e" : passed >= 2 ? "#f59e0b" : "#ef4444";
  const label = passed === 3 ? "Strong" : passed >= 2 ? "Fair" : "Weak";

  return (
    <div className="signup-strength-wrap">
      <div className="signup-strength-bar-track">
        <div
          className="signup-strength-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="signup-strength-label" style={{ color }}>{label}</span>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated, isLoading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const allRequirementsMet = PASSWORD_REQUIREMENTS.every((r) => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!allRequirementsMet) { setError("Password does not meet the requirements."); return; }
    setError("");
    setIsLoading(true);
    try {
      await signup(name, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Sign up failed. Please try again.");
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
          <div className="auth-card-header">
            <h1 className="auth-card-title">Create your account</h1>
            <p className="auth-card-subtitle">Start building with your documents today</p>
          </div>

          <div className="auth-divider" />

          {error && (
            <div className="auth-error-banner" role="alert">
              <div className="auth-error-dot" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field-group">
              <Input
                id="signup-name"
                label="Full name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftElement={<User size={15} />}
                autoComplete="name"
                required
              />
              <Input
                id="signup-email"
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
                  id="signup-password"
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
                  autoComplete="new-password"
                />
                {password && (
                  <div className="signup-requirements-wrap">
                    <PasswordStrength password={password} />
                    <div className="signup-req-list">
                      {PASSWORD_REQUIREMENTS.map((req) => {
                        const ok = req.test(password);
                        return (
                          <div key={req.label} className="signup-req-item">
                            <div
                              className="signup-req-icon"
                              style={{
                                background: ok ? "var(--status-success)" : "var(--border-default)",
                                border: ok ? "1px solid transparent" : "1px solid var(--border-strong)",
                              }}
                            >
                              {ok && <Check size={8} strokeWidth={3.5} color="#000" />}
                            </div>
                            <span
                              className="signup-req-label"
                              style={{ color: ok ? "var(--status-success)" : "var(--text-muted)" }}
                            >
                              {req.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <Input
                id="signup-confirm-password"
                label="Confirm password"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftElement={<Lock size={15} />}
                error={confirmPassword && confirmPassword !== password ? "Passwords do not match" : undefined}
                autoComplete="new-password"
              />
            </div>

            <Button
              id="signup-submit"
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="auth-submit-btn"
            >
              {!isLoading && (
                <>
                  Create account
                  <ArrowRight size={15} className="auth-btn-arrow" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="auth-footer-text">
          Already have an account?{" "}
          <Link href="/login" className="auth-footer-link">
            Sign in
          </Link>
        </p>

        <div className="auth-trust-row">
          {["Free to start", "No credit card", "Cancel anytime"].map((t) => (
            <span key={t} className="auth-trust-item">
              <span className="auth-trust-dot" />
              {t}
            </span>
          ))}
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
          top: -150px; right: -100px;
          animation-delay: 0s;
        }

        .auth-orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #3b82f6 0%, transparent 70%);
          bottom: -100px; left: -80px;
          animation-delay: -3s;
        }

        .auth-orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
          top: 40%; right: 10%;
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

        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .auth-field-group { display: flex; flex-direction: column; gap: 14px; }

        /* Password strength */
        .signup-requirements-wrap {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .signup-strength-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .signup-strength-bar-track {
          flex: 1;
          height: 3px;
          border-radius: 999px;
          background: var(--border-default);
          overflow: hidden;
        }

        .signup-strength-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 300ms ease, background 300ms ease;
        }

        .signup-strength-label {
          font-size: 11px;
          font-weight: 600;
          min-width: 34px;
          text-align: right;
        }

        .signup-req-list {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .signup-req-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .signup-req-icon {
          width: 14px; height: 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 200ms ease;
        }

        .signup-req-label {
          font-size: 12px;
          transition: color 200ms ease;
        }

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

        .auth-btn-arrow { transition: transform 200ms ease; }
        .auth-submit-btn:hover .auth-btn-arrow { transform: translateX(2px); }

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
