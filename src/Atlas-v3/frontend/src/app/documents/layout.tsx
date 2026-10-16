import { DashboardShell } from "@/components/layout/Shell";

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
