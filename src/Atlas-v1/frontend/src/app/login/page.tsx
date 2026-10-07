"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button, Input, Spinner } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
          >
            <img src="/logo.png" alt="Atlas Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Welcome back
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Sign in to your Atlas workspace
            </p>
          </div>
        </div>

        {/* Card */}
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
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftElement={<Mail size={15} />}
              autoComplete="email"
              required
            />
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
              autoComplete="current-password"
              required
            />

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs" style={{ color: "var(--text-muted)" }}>
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" isLoading={isLoading} className="w-full justify-center">
              Sign in <ArrowRight size={15} />
            </Button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "var(--accent-primary)" }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
