import { DashboardShell } from "@/components/layout/Shell";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
