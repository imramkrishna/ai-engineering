"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "@/types";
import { mockAuth } from "@/lib/mock";

// Toggle this env var to switch between mock and real API
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap — check existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        if (USE_MOCK) {
          // Check local storage for mock session instead of auto-login
          const stored = localStorage.getItem("atlas_mock_user");
          if (stored) {
            setUser(JSON.parse(stored));
          } else {
            setUser(null);
          }
        } else {
          const { authApi } = await import("@/lib/api/client");
          const u = await authApi.getCurrentUser();
          setUser(u);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (USE_MOCK) {
      const { user } = await mockAuth.login(email, password);
      localStorage.setItem("atlas_mock_user", JSON.stringify(user));
      setUser(user);
    } else {
      const { authApi } = await import("@/lib/api/client");
      const { user } = await authApi.login({ email, password });
      setUser(user);
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (USE_MOCK) {
      const { user } = await mockAuth.signup();
      localStorage.setItem("atlas_mock_user", JSON.stringify(user));
      setUser(user);
    } else {
      const { authApi } = await import("@/lib/api/client");
      const { user } = await authApi.signup({ name, email, password });
      setUser(user);
    }
  }, []);

  const logout = useCallback(async () => {
    if (USE_MOCK) {
      await mockAuth.logout();
      localStorage.removeItem("atlas_mock_user");
    } else {
      const { authApi } = await import("@/lib/api/client");
      await authApi.logout();
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
