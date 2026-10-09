"use client";

import React, { createContext, useContext, useCallback, useMemo } from "react";
import type { User } from "@/types";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: sessionData, isPending } = authClient.useSession();

  const user: User | null = sessionData?.user ? {
    id: sessionData.user?.id,
    name: sessionData.user?.name,
    email: sessionData.user?.email,
    avatarUrl: sessionData.user?.image ?? undefined,
    createdAt: new Date(sessionData.user?.createdAt ?? Date.now()).toISOString(),
  } : null;

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authClient.signIn.email({ email, password });
      // better-auth client returns an error object on failure; check API status explicitly
      if (response && "error" in response && response.error) {
        const message = (response.error as { message?: string }).message || "Login failed";
        toast.error(message);
        throw new Error(message);
      }
      toast.success("Login successful!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      toast.error(message);
      throw new Error(message);
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const response = await authClient.signUp.email({ name, email, password });
      // better-auth client returns an error object on failure; check API status explicitly
      if (response && "error" in response && response.error) {
        const message = (response.error as { message?: string }).message || "Signup failed";
        toast.error(message);
        throw new Error(message);
      }
      toast.success("Account created successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      toast.error(message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authClient.signOut();
      toast.success("Logged out successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logout failed");
      throw new Error(error instanceof Error ? error.message : "Logout failed");
    }
  }, []);

  const value = useMemo(() => ({
    user,
    isLoading: isPending,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
  }), [user, isPending, login, signup, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
