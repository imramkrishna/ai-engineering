"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button, Input } from "@/components/ui";

const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains uppercase", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Contains a number", test: (p: string) => /\d/.test(p) },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const allRequirementsMet = PASSWORD_REQUIREMENTS.every((r) => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!allRequirementsMet) { setError("Password does not meet requirements."); return; }
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

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
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
              Create your account
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Start building with your documents
            </p>
          </div>
        </div>

        <div
          className="p-6 rounded-[var(--radius-xl)] flex flex-col gap-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
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
              label="Email"
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
                label="Password"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftElement={<Lock size={15} />}
                rightElement={
                  <button type="button" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
                autoComplete="new-password"
              />
              {password && (
                <div className="mt-2 flex flex-col gap-1">
                  {PASSWORD_REQUIREMENTS.map((req) => (
                    <div key={req.label} className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                        style={{
                          background: req.test(password) ? "var(--status-success)" : "var(--border-default)",
                        }}
                      >
                        {req.test(password) && <Check size={8} strokeWidth={3} color="#000" />}
                      </div>
                      <span
                        className="text-xs"
                        style={{ color: req.test(password) ? "var(--status-success)" : "var(--text-muted)" }}
                      >
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Input
              label="Confirm password"
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftElement={<Lock size={15} />}
              error={confirmPassword && confirmPassword !== password ? "Passwords do not match" : undefined}
              autoComplete="new-password"
            />

            <Button type="submit" variant="primary" isLoading={isLoading} className="w-full justify-center mt-1">
              Create account <ArrowRight size={15} />
            </Button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent-primary)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
