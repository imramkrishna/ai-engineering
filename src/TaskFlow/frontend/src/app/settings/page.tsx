"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Sliders, Brain, Bell, Shield, MessageSquare, Info } from "lucide-react";
import { PageHeader, Toggle, Button, Divider } from "@/components/ui";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type ThemeOption = "dark" | "light" | "system";

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: React.ElementType }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

type SettingsSection = "general" | "appearance" | "chat" | "rag" | "memory" | "notifications" | "security";

const SECTIONS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: "appearance", label: "Appearance", icon: Sun },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "rag", label: "RAG / Retrieval", icon: Sliders },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="atlas-card p-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color: "var(--accent-primary)" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
      </div>
      <Divider />
      {children}
    </div>
  );
}

function SettingRow({
  label,
  description,
  control,
  unavailable,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
  unavailable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm" style={{ color: unavailable ? "var(--text-muted)" : "var(--text-primary)" }}>{label}</p>
          {unavailable && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>
              Not yet available
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{description}</p>
        )}
      </div>
      <div style={{ opacity: unavailable ? 0.4 : 1, pointerEvents: unavailable ? "none" : "auto" }}>
        {control}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");

  useEffect(() => {
    setMounted(true);
  }, []);

  // RAG settings
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.7);
  const [showCitations, setShowCitations] = useState(true);

  // Chat settings
  const [enterToSend, setEnterToSend] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  // Memory
  const [memEnabled, setMemEnabled] = useState(true);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
      <PageHeader title="Settings" description="Configure Atlas to match your preferences" />

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="hidden md:flex flex-col gap-0.5 w-48 flex-shrink-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn("nav-item text-left", activeSection === id && "active")}
            >
              <Icon size={16} className="nav-icon" />{label}
            </button>
          ))}
        </div>

        {/* Mobile section select */}
        <div className="md:hidden w-full">
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value as SettingsSection)}
            className="atlas-input text-sm"
          >
            {SECTIONS.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-5">
          {activeSection === "appearance" && (
            <SectionCard title="Appearance" icon={Sun}>
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-md)] transition-all"
                      style={{
                        background: theme === value ? "var(--bg-active)" : "var(--bg-base)",
                        border: `1px solid ${theme === value ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                        color: theme === value ? "var(--text-primary)" : "var(--text-muted)",
                      }}
                    >
                      <Icon size={18} />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Theme is currently applied via CSS variables. Full next-themes integration is ready to add.
                </p>
              </div>
            </SectionCard>
          )}

          {activeSection === "chat" && (
            <SectionCard title="Chat" icon={MessageSquare}>
              <div className="flex flex-col gap-4">
                <SettingRow
                  label="Enter to send"
                  description="Press Enter to send messages. Use Shift+Enter for a newline."
                  control={<Toggle checked={enterToSend} onChange={setEnterToSend} />}
                />
                <Divider />
                <SettingRow
                  label="Show debug panel"
                  description="Display retrieval metadata and latency for each RAG response."
                  control={<Toggle checked={showDebug} onChange={setShowDebug} />}
                />
              </div>
            </SectionCard>
          )}

          {activeSection === "rag" && (
            <SectionCard title="RAG / Retrieval" icon={Sliders}>
              <div className="flex flex-col gap-4">
                <SettingRow
                  label="Retrieved chunks (top-K)"
                  description="Number of document chunks retrieved per query."
                  control={
                    <div className="flex items-center gap-2">
                      <input
                        type="range" min={1} max={20} value={topK}
                        onChange={(e) => setTopK(Number(e.target.value))}
                        className="w-24 accent-[var(--accent-primary)]"
                        aria-label="Top K"
                      />
                      <span className="text-sm font-mono w-6 text-right" style={{ color: "var(--text-primary)" }}>{topK}</span>
                    </div>
                  }
                />
                <Divider />
                <SettingRow
                  label="Similarity threshold"
                  description="Minimum relevance score required to include a chunk."
                  control={
                    <div className="flex items-center gap-2">
                      <input
                        type="range" min={0.5} max={0.99} step={0.01} value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="w-24 accent-[var(--accent-primary)]"
                        aria-label="Similarity threshold"
                      />
                      <span className="text-sm font-mono w-10 text-right" style={{ color: "var(--text-primary)" }}>{threshold.toFixed(2)}</span>
                    </div>
                  }
                />
                <Divider />
                <SettingRow
                  label="Show citations"
                  description="Display source citations alongside RAG answers."
                  control={<Toggle checked={showCitations} onChange={setShowCitations} />}
                />
                <Divider />
                <SettingRow
                  label="Selected model"
                  description="LLM used for generating answers."
                  control={
                    <select className="atlas-input text-xs py-1.5 px-2 w-40" style={{ height: "auto" }}>
                      <option>gpt-4o-mini</option>
                      <option>gpt-4o</option>
                    </select>
                  }
                />
                <Divider />
                <SettingRow
                  label="Retrieval mode"
                  unavailable
                  description="MMR (Maximal Marginal Relevance) diversity mode. Available when backend supports it."
                  control={<Toggle checked={false} onChange={() => {}} />}
                />
              </div>
            </SectionCard>
          )}

          {activeSection === "memory" && (
            <SectionCard title="Memory" icon={Brain}>
              <div className="flex flex-col gap-4">
                <SettingRow
                  label="Enable memory"
                  description="Allow Atlas to learn from your conversations and personalize responses."
                  control={<Toggle checked={memEnabled} onChange={setMemEnabled} />}
                />
                <div
                  className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] text-xs"
                  style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}
                >
                  <Info size={14} style={{ flexShrink: 0 }} />
                  Memories are stored server-side and injected into conversation context. Manage them in the{" "}
                  <a href="/memory" style={{ color: "var(--accent-primary)" }}>Memory</a> section.
                </div>
              </div>
            </SectionCard>
          )}

          {activeSection === "notifications" && (
            <SectionCard title="Notifications" icon={Bell}>
              <div className="flex flex-col gap-4">
                <SettingRow
                  label="Document processing alerts"
                  unavailable
                  description="Notify when document indexing completes or fails."
                  control={<Toggle checked={false} onChange={() => {}} />}
                />
                <Divider />
                <SettingRow
                  label="Email notifications"
                  unavailable
                  description="Receive email summaries and alerts."
                  control={<Toggle checked={false} onChange={() => {}} />}
                />
              </div>
            </SectionCard>
          )}

          {activeSection === "security" && (
            <SectionCard title="Security" icon={Shield}>
              <div className="flex flex-col gap-4">
                <SettingRow
                  label="Change password"
                  unavailable
                  description="Update your account password."
                  control={<Button variant="secondary" size="sm" disabled>Change</Button>}
                />
                <Divider />
                <SettingRow
                  label="Two-factor authentication"
                  unavailable
                  description="Add an extra layer of security to your account."
                  control={<Toggle checked={false} onChange={() => {}} />}
                />
                <Divider />
                <SettingRow
                  label="Active sessions"
                  unavailable
                  description="View and revoke active login sessions."
                  control={<Button variant="secondary" size="sm" disabled>View sessions</Button>}
                />
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
