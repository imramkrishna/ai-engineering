"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  FileText,
  Search,
  Brain,
  Settings,
  User,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
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
  { href: "/chat",      label: "Chat",       icon: MessageSquare },
  { href: "/documents", label: "Documents",  icon: FileText },
  { href: "/search",    label: "Search",     icon: Search },
  { href: "/memory",    label: "Memory",     icon: Brain },
];

const BOTTOM_NAV: NavItem[] = [
  { href: "/account",  label: "Account",  icon: User },
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
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
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
        {/* ── Logo bar ── */}
        <div
          className="flex items-center flex-shrink-0 px-3"
          style={{
            height: 52,
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="w-7 h-7 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center cursor-pointer"
              style={{
                background: "var(--accent-primary-muted)",
                border: "1px solid var(--accent-primary-border)",
              }}
              onClick={collapsed ? onToggleCollapse : undefined}
              title={collapsed ? "Expand sidebar (⌘B)" : undefined}
            >
              <img
                src="/logo.png"
                alt="Atlas"
                className="w-[18px] h-[18px] object-contain"
              />
            </div>
            {!collapsed && (
              <span
                className="font-semibold text-[15px] truncate"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
              >
                Atlas
              </span>
            )}
          </div>

          {/* Desktop collapse toggle inside header */}
          {!collapsed ? (
            <Tooltip content="Collapse sidebar" side="bottom">
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={16} strokeWidth={1.8} />
              </button>
            </Tooltip>
          ) : (
            <Tooltip content="Expand sidebar" side="right">
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] mx-auto"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen size={16} strokeWidth={1.8} />
              </button>
            </Tooltip>
          )}

          {/* Mobile close */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg md:hidden transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── New Chat ── */}
        <div className="px-2.5 py-2.5 flex-shrink-0">
          {collapsed ? (
            <Tooltip content="New Chat" side="right">
              <Link
                href="/chat/new"
                onClick={onCloseMobile}
                className="w-8 h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] hover:border-[var(--border-strong)] flex items-center justify-center mx-auto transition-colors shadow-xs"
                aria-label="New chat"
              >
                <Plus size={18} strokeWidth={2.5} className="text-[var(--text-primary)] flex-shrink-0" />
              </Link>
            </Tooltip>
          ) : (
            <Link
              href="/chat/new"
              onClick={onCloseMobile}
              className="atlas-btn atlas-btn-secondary w-full text-[12.5px] h-8"
              style={{ gap: 6 }}
            >
              <Plus size={15} strokeWidth={2.5} />
              New chat
            </Link>
          )}
        </div>

        {/* ── Main nav ── */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 flex flex-col gap-0.5 scrollbar-thin">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            const item = (
              <Link
                key={href}
                href={href}
                onClick={onCloseMobile}
                className={cn("nav-item", isActive && "active")}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon size={15} className="nav-icon flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={href} content={label} side="right">{item}</Tooltip>
            ) : item;
          })}
        </nav>

        {/* ── Bottom nav ── */}
        <div
          className="px-2 pt-2 pb-2.5 flex flex-col gap-0.5 flex-shrink-0"
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
                title={collapsed ? label : undefined}
              >
                <Icon size={15} className="nav-icon flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={href} content={label} side="right">{item}</Tooltip>
            ) : item;
          })}

          {/* User row */}
          {user && (
            <div
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg mt-0.5 group",
                "transition-colors cursor-default"
              )}
              style={{ background: "var(--bg-active)" }}
            >
              <Avatar name={user.name} size={26} />
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13.5px] font-medium truncate leading-tight"
                      style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
                    >
                      {user.name}
                    </p>
                    <p
                      className="text-[12px] truncate leading-tight mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                    style={{ color: "var(--text-muted)" }}
                    aria-label="Sign out"
                    title="Sign out"
                  >
                    <LogOut size={13} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── Mobile Header ────────────────────────────────────────────
export function MobileHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header
      className="flex items-center gap-3 px-4 md:hidden flex-shrink-0"
      style={{
        height: 52,
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-sidebar)",
      }}
    >
      <button
        onClick={onOpenMenu}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: "var(--text-secondary)" }}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center overflow-hidden"
        style={{
          background: "var(--accent-primary-muted)",
          border: "1px solid var(--accent-primary-border)",
        }}
      >
        <img src="/logo.png" alt="Atlas" className="w-[14px] h-[14px] object-contain" />
      </div>
      <span
        className="font-semibold text-sm"
        style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
      >
        Atlas
      </span>
    </header>
  );
}

// ─── Loading Screen ────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div
      className="flex h-screen items-center justify-center flex-col gap-3"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: "var(--accent-primary-muted)",
          border: "1px solid var(--accent-primary-border)",
        }}
      >
        <Spinner size={18} className="text-[var(--accent-primary)]" />
      </div>
    </div>
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        {/* Top desktop header bar when collapsed */}
        {collapsed && (
          <div
            className="hidden md:flex items-center px-3 flex-shrink-0 animate-fade-in"
            style={{
              height: 44,
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--bg-base)",
            }}
          >
            <Tooltip content="Expand sidebar (⌘B)" side="bottom">
              <button
                onClick={() => setCollapsed(false)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen size={15} strokeWidth={1.8} />
                <span>Sidebar</span>
              </button>
            </Tooltip>
          </div>
        )}
        <main className="flex-1 overflow-auto relative">
          {(isLoading || !isAuthenticated) && (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center"
              style={{ background: "var(--bg-base)" }}
            >
              <LoadingScreen />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
