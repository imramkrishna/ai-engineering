"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button, Input, Spinner } from "@/components/ui";
import { AuthChatShowcase } from "@/components/auth/AuthChatShowcase";

const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "number", label: "Contains a number", test: (p: string) => /\d/.test(p) },
  { id: "special", label: "Contains special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

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

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-[var(--bg-base)] text-[var(--text-primary)] relative overflow-hidden selection:bg-[var(--accent-primary)] selection:text-black">
      {/* Ambient background glow to softly tie the two sides together */}
      <div className="pointer-events-none absolute -top-40 right-1/4 w-[500px] h-[500px] bg-[rgba(32,178,170,0.05)] rounded-full blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 w-[450px] h-[450px] bg-[rgba(255,255,255,0.02)] rounded-full blur-[120px]" />

      {/* ── Left Side: Form Panel ── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 md:p-8 lg:p-12 xl:p-14 max-w-xl mx-auto w-full md:max-w-none md:w-[50%] lg:w-[48%] xl:w-[44%] z-10 relative">
        {/* Brand header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <img src="/logo.png" alt="Atlas" className="w-[18px] h-[18px] object-contain" />
            </div>
            <span className="font-semibold text-[17px] tracking-tight text-[var(--text-primary)]">
              Atlas
            </span>
          </Link>

          {/* Mobile-only toggle */}
          <Link
            href="/login"
            className="md:hidden text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5 rounded-md hover:bg-[var(--bg-hover)]"
          >
            Sign in instead
          </Link>
        </div>

        {/* Center Content Box */}
        <div className="my-auto py-8 w-full max-w-[380px] mx-auto flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">
              Create your account
            </h1>
            <p className="text-[13.5px] text-[var(--text-secondary)]">
              Start querying and exploring your documents today
            </p>
          </div>

          {/* Social login buttons (Locked for now) */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[13px] font-medium opacity-80 cursor-not-allowed transition-all select-none"
              title="Google sign-up is currently locked"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z" />
              </svg>
              <span>Continue with Google</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                <Lock size={10} />
              </span>
            </button>

            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[13px] font-medium opacity-80 cursor-not-allowed transition-all select-none"
              title="Apple sign-up is currently locked"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.56.65-.96 1.7-.83 2.72 1.01.08 2.03-.53 2.54-1.22z" />
              </svg>
              <span>Continue with Apple</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                <Lock size={10} />
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-0.5">
            <div className="flex-1 h-[1px] bg-[var(--border-subtle)]" />
            <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              or register with email
            </span>
            <div className="flex-1 h-[1px] bg-[var(--border-subtle)]" />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#f87171] text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
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
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
                autoComplete="new-password"
                required
              />

              {/* Real-time Checklist */}
              {password && (
                <div className="flex flex-col gap-1.5 mt-2.5 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  {PASSWORD_REQUIREMENTS.map((req) => {
                    const met = req.test(password);
                    return (
                      <div key={req.id} className="flex items-center gap-2 text-[11.5px]">
                        <span
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] ${
                            met ? "bg-[var(--status-success)] text-black" : "bg-[var(--border-default)] text-[var(--text-muted)]"
                          }`}
                        >
                          {met ? <Check size={9} strokeWidth={3} /> : "•"}
                        </span>
                        <span style={{ color: met ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {req.label}
                        </span>
                      </div>
                    );
                  })}
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
              required
            />

            <Button
              id="signup-submit"
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full justify-center h-10 mt-1 !text-[13.5px]"
            >
              {!isLoading && (
                <>
                  Create account
                  <ArrowRight size={14} className="ml-1" />
                </>
              )}
            </Button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-[var(--text-muted)]">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--accent-primary)] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Bottom subtle trust indicators */}
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-6 border-t border-[var(--border-subtle)]">
          <span>© Atlas AI Inc.</span>
          <div className="flex items-center gap-4 md:hidden">
            <span className="hover:text-[var(--text-secondary)] transition-colors cursor-default">Privacy</span>
            <span className="hover:text-[var(--text-secondary)] transition-colors cursor-default">Terms</span>
            <span className="hover:text-[var(--text-secondary)] transition-colors cursor-default">Security</span>
          </div>
        </div>
      </div>

      {/* ── Right Side: Curated Showcase Panel (Seamlessly Blended, visible on md+) ── */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-6 sm:p-10 md:p-8 lg:p-12 xl:p-14 relative z-10">
        {/* Top Header: Shifted Sign in Link */}
        <div className="flex items-center justify-end">
          <Link
            href="/login"
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5 rounded-md hover:bg-[var(--bg-hover)]"
          >
            Sign in instead
          </Link>
        </div>

        {/* Center Floating Showcase Card with reduced height & animated chat simulation */}
        <div className="my-auto w-full flex items-center justify-center py-4">
          <AuthChatShowcase />
        </div>

        {/* Bottom subtle trust indicators (Privacy, Terms, Security shifted to right side) */}
        <div className="flex items-center justify-end text-[11px] text-[var(--text-muted)] pt-6 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-4">
            <span className="hover:text-[var(--text-secondary)] transition-colors cursor-default">Privacy</span>
            <span className="hover:text-[var(--text-secondary)] transition-colors cursor-default">Terms</span>
            <span className="hover:text-[var(--text-secondary)] transition-colors cursor-default">Security</span>
          </div>
        </div>
      </div>
    </div>
  );
}
