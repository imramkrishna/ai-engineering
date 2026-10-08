"use client";

import React, { createContext, useContext, useCallback, useMemo, useEffect } from "react";
import type { User } from "@/types";
import { mockAuthClient } from "@/lib/mock-auth-client";

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
  const { data: sessionData, isPending } = mockAuthClient.useSession();

  const user: User | null = sessionData?.user ? {
    id: sessionData.user?.id,
    name: sessionData.user?.name,
    email: sessionData.user?.email,
    avatarUrl: sessionData.user?.avatarUrl ?? undefined,
    createdAt: sessionData.user?.createdAt ?? new Date().toISOString(),
  } : null;

  const login = useCallback(async (email: string, password: string) => {
    try {
      await mockAuthClient.signIn.email({ email, password });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Login failed");
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      await mockAuthClient.signUp.email({ name, email, password });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Signup failed");
    }
  }, []);

  const logout = useCallback(async () => {
    await mockAuthClient.signOut();
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
