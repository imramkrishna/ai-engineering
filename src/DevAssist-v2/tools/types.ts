export type SessionContext = {
  userId: string;
  role?: "admin" | "developer" | "member";
};
