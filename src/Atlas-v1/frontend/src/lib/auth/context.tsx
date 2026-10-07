"use client";

import React, { createContext, useContext, useCallback, useMemo } from "react";
import type { User } from "@/types";
import { authClient } from "@/lib/auth-client";

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
    id: sessionData.user.id,
    name: sessionData.user.name,
    email: sessionData.user.email,
    avatarUrl: sessionData.user.image ?? undefined,
    createdAt: sessionData.user.createdAt instanceof Date
      ? sessionData.user.createdAt.toISOString()
      : String(sessionData.user.createdAt),
  } : null;

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      throw new Error(error.message || "Failed to login");
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      throw new Error(error.message || "Failed to sign up");
    }
  }, []);

  const logout = useCallback(async () => {
    await authClient.signOut();
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
