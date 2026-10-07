import { DashboardShell } from "@/components/layout/Shell";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
