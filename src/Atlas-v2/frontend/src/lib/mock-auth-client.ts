"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "@/types";
import { mockAuth } from "./mock";

interface Session {
  user: User | null;
  expires: Date | null;
}

interface AuthError {
  message: string;
}

interface MockAuthClient {
  useSession: () => {
    data: Session | null;
    isPending: boolean;
  };
  signIn: {
    email: (params: { email: string; password: string }) => Promise<{ user: User | null; error: AuthError | null }>;
  };
  signUp: {
    email: (params: { name: string; email: string; password: string }) => Promise<{ user: User | null; error: AuthError | null }>;
  };
  signOut: () => Promise<void>;
  getSession: () => Promise<Session | null>;
}

// Mock auth client that mimics better-auth client API
export const mockAuthClient: MockAuthClient = {
  useSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
      const loadSession = async () => {
        setIsPending(true);
        try {
          const user = await mockAuth.getCurrentUser();
          if (user) {
            setSession({
              user,
              expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            });
          } else {
            setSession(null);
          }
        } catch (error) {
          console.error("Failed to load session:", error);
          setSession(null);
        } finally {
          setIsPending(false);
        }
      };

      loadSession();
    }, []);

    return { data: session, isPending };
  },

  signIn: {
    email: async ({ email, password }) => {
      try {
        const { user } = await mockAuth.login(email, password);
        return { user, error: null };
      } catch (error) {
        return {
          user: null,
          error: { message: error instanceof Error ? error.message : "Login failed" }
        };
      }
    },
  },

  signUp: {
    email: async ({ name, email, password }) => {
      try {
        const { user } = await mockAuth.signup();
        return { user, error: null };
      } catch (error) {
        return {
          user: null,
          error: { message: error instanceof Error ? error.message : "Signup failed" }
        };
      }
    },
  },

  signOut: async () => {
    await mockAuth.logout();
  },

  getSession: async () => {
    try {
      const user = await mockAuth.getCurrentUser();
      if (user) {
        return {
          user,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };
      }
      return null;
    } catch (error) {
      console.error("Failed to get session:", error);
      return null;
    }
  },
};