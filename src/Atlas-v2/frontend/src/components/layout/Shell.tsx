"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  MessageSquare,
  FileText,
  Search,
  Brain,
  Settings,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import { Avatar, Tooltip, Spinner } from "@/components/ui";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/search", label: "Search", icon: Search },
  { href: "/memory", label: "Memory", icon: Brain },
];

const BOTTOM_NAV: NavItem[] = [
  { href: "/account", label: "Account", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

// ─── Sidebar ──────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          "atlas-sidebar",
          collapsed && "collapsed",
          mobileOpen && "open"
        )}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
          >
            <img src="/logo.png" alt="Atlas Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--text-primary)" }}>
              Atlas
            </span>
          )}
          <button
            onClick={onCloseMobile}
            className="ml-auto md:hidden"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* New Chat button */}
        <div className="px-3 py-3 flex-shrink-0">
          <Link
            href="/chat"
            onClick={onCloseMobile}
            className={cn(
              "atlas-btn atlas-btn-primary w-full justify-center",
              collapsed && "px-0 py-2.5 aspect-square"
            )}
          >
            <Plus size={16} />
            {!collapsed && <span>New Chat</span>}
          </Link>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            const item = (
              <Link
                key={href}
                href={href}
                onClick={onCloseMobile}
                className={cn("nav-item", isActive && "active")}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={18} className="nav-icon" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={href} content={label}>{item}</Tooltip>
            ) : item;
          })}
        </nav>

        {/* Bottom nav */}
        <div
          className="px-2 py-2 flex flex-col gap-0.5 flex-shrink-0"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            const item = (
              <Link
                key={href}
                href={href}
                onClick={onCloseMobile}
                className={cn("nav-item", isActive && "active")}
              >
                <Icon size={18} className="nav-icon" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={href} content={label}>{item}</Tooltip>
            ) : item;
          })}

          {/* User row */}
          {user && (
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] mt-1",
                "cursor-pointer transition-all",
              )}
              style={{ background: "var(--bg-active)" }}
            >
              <Avatar name={user.name} size={28} />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{user.name}</p>
                  <button
                    onClick={logout}
                    className="text-xs transition-colors"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex absolute -right-3 top-8 w-6 h-6 rounded-full items-center justify-center z-10 mr-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", color: "var(--text-muted)" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  );
}

// ─── Mobile Header ────────────────────────────────────────────
export function MobileHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header
      className="flex items-center gap-3 px-4 py-3 md:hidden flex-shrink-0"
      style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-sidebar)" }}
    >
      <button
        onClick={onOpenMenu}
        className="p-1.5 rounded-lg"
        style={{ color: "var(--text-secondary)" }}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center overflow-hidden"
      >
        <img src="/logo.png" alt="Atlas Logo" className="w-full h-full object-contain" />
      </div>
      <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Atlas</span>
    </header>
  );
}

// ─── Dashboard Shell ──────────────────────────────────────────
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="atlas-shell">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="atlas-main">
        <MobileHeader onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
