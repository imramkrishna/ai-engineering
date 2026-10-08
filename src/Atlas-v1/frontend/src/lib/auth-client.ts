import { createAuthClient } from "better-auth/react";
import { mockAuthClient } from "./mock-auth-client";

// Use mock auth client for development purposes
export const authClient = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true" ? mockAuthClient : createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3002/api/auth",
});