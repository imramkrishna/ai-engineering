"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  ArrowUp,
  FileText,
  CheckCircle2,
  Shield,
  Layers,
  Database,
  Search,
  Cpu,
  BarChart3,
  TrendingUp,
} from "lucide-react";

interface Scenario {
  id: string;
  category: string;
  userPrompt: string;
  linkedDocs: string;
  steps: string[];
  response: string;
  citations: { name: string; page: string }[];
  metrics?: { label: string; value: string; positive?: boolean }[];
  tag: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "ddd",
    category: "Architecture & Design",
    userPrompt: "what is domain driven design book about explain me in short",
    linkedDocs: "Domain_Driven_Design_Evans.pdf",
    steps: ["Scanning software architecture books", "Locating core domain & ubiquitous language", "Grounding citations [Source 1..4]"],
    response:
      "• Focus on the domain: Software architecture centers on core business domain logic [Source 1]. • Collaborative language: Teams use ubiquitous language to connect developers and domain experts [Source 2]. • Technical isolation: The model is cleanly isolated within a dedicated domain layer [Source 3].",
    citations: [
      { name: "Domain_Driven_Design.pdf", page: "Source 1" },
      { name: "Ubiquitous_Language_Spec.md", page: "Source 2" },
      { name: "Enterprise_Patterns.docx", page: "Source 3" },
    ],
    tag: "Verified Citations",
  },
  {
    id: "finance",
    category: "Financial Synthesis",
    userPrompt: "Extract Q3 Net Revenue Retention (NRR) and gross margin trends from the shareholder report.",
    linkedDocs: "Q3_Shareholder_Letter.pdf",
    steps: ["Parsing financial disclosures", "Reconciling GAAP metrics", "Computing YoY delta"],
    response:
      "Q3 Net Revenue Retention reached 128% (+4% YoY), driven by enterprise workspace expansion. Non-GAAP gross margin held steady at 78.4% with recurring cloud margins expanding by 160 bps.",
    citations: [
      { name: "Q3_Shareholder_Letter.pdf", page: "p. 12" },
      { name: "FY24_Investor_Model.xlsx", page: "Sheet 3" },
    ],
    metrics: [
      { label: "NRR", value: "128%", positive: true },
      { label: "Gross Margin", value: "78.4%" },
      { label: "Enterprise ARR", value: "$42.5M", positive: true },
    ],
    tag: "Deterministic RAG",
  },
  {
    id: "security",
    category: "Architecture & Security",
    userPrompt: "Verify multi-tenant vector isolation and encryption standards for compliance review.",
    linkedDocs: "SOC2_Type_II_Spec.pdf",
    steps: ["Querying security control matrix", "Verifying cryptographic storage"],
    response:
      "Tenant vector embeddings are partitioned per workspace with AES-256-GCM encryption at rest and strict mTLS in transit. SOC-2 Type II audit confirms zero cross-tenant memory persistence.",
    citations: [
      { name: "SOC2_Type_II_Spec.pdf", page: "p. 6" },
      { name: "Cloud_Infra_Matrix.yaml", page: "sec-4" },
    ],
    tag: "SOC-2 Certified",
  },
];

export function AuthChatShowcase() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [phase, setPhase] = useState<"typing-prompt" | "sending" | "thinking" | "streaming" | "completed">("typing-prompt");
  const [typedPrompt, setTypedPrompt] = useState("");
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [displayedResponse, setDisplayedResponse] = useState("");
  const [showCitations, setShowCitations] = useState(false);

  const scenario = SCENARIOS[scenarioIndex];
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer helper
  const clearCurrentTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    let isCancelled = false;

    // Reset state for new scenario
    setTypedPrompt("");
    setDisplayedResponse("");
    setShowCitations(false);
    setCurrentStepIdx(0);
    setPhase("typing-prompt");

    // Phase 1: Type the user prompt with realistic typing cadence
    let charIdx = 0;
    const fullPrompt = scenario.userPrompt;

    const typeNextChar = () => {
      if (isCancelled) return;
      if (charIdx < fullPrompt.length) {
        setTypedPrompt(fullPrompt.slice(0, charIdx + 1));
        charIdx++;
        const delay = Math.random() * 20 + 15; // Fast, snappy typing
        timerRef.current = setTimeout(typeNextChar, delay);
      } else {
        // Pause briefly after typing before sending
        timerRef.current = setTimeout(() => {
          if (isCancelled) return;
          setPhase("sending");

          // Brief delay then enter thinking phase
          timerRef.current = setTimeout(() => {
            if (isCancelled) return;
            setPhase("thinking");
            runThinkingSteps();
          }, 350);
        }, 500);
      }
    };

    // Phase 2: Thinking Steps
    const runThinkingSteps = () => {
      let step = 0;
      const totalSteps = scenario.steps.length;

      const advanceStep = () => {
        if (isCancelled) return;
        if (step < totalSteps - 1) {
          step++;
          setCurrentStepIdx(step);
          timerRef.current = setTimeout(advanceStep, 450);
        } else {
          // Finished thinking -> start streaming response
          timerRef.current = setTimeout(() => {
            if (isCancelled) return;
            setPhase("streaming");
            streamResponse();
          }, 350);
        }
      };

      timerRef.current = setTimeout(advanceStep, 450);
    };

    // Phase 3: Stream AI Response words
    const streamResponse = () => {
      const words = scenario.response.split(" ");
      let wordIdx = 0;

      const streamNextWord = () => {
        if (isCancelled) return;
        if (wordIdx < words.length) {
          setDisplayedResponse(words.slice(0, wordIdx + 1).join(" "));
          wordIdx++;
          const delay = Math.random() * 25 + 30; // Snappy streaming
          timerRef.current = setTimeout(streamNextWord, delay);
        } else {
          // Streaming finished -> reveal citations & metrics
          setPhase("completed");
          setShowCitations(true);

          // Hold completed state for viewing, then transition to next scenario
          timerRef.current = setTimeout(() => {
            if (isCancelled) return;
            setScenarioIndex((prev) => (prev + 1) % SCENARIOS.length);
          }, 4500);
        }
      };

      streamNextWord();
    };

    // Start typing after initial short delay
    timerRef.current = setTimeout(typeNextChar, 300);

    return () => {
      isCancelled = true;
      clearCurrentTimer();
    };
  }, [scenarioIndex]);

  return (
    <div
      className="relative w-full max-w-xl h-[470px] lg:h-[490px] xl:h-[510px] rounded-2xl xl:rounded-3xl overflow-hidden border border-[rgba(255,255,255,0.1)] flex flex-col justify-between p-5 sm:p-6 lg:p-7 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9),0_0_50px_rgba(32,178,170,0.06)]"
      style={{
        background: "linear-gradient(135deg, rgba(18,20,23,0.92) 0%, rgba(12,13,15,0.96) 100%)",
      }}
    >
      {/* Background cinematic tone and ambient lighting */}
      <img
        src="/auth-showcase.jpg"
        alt="Atlas Intelligence Canvas"
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.2] contrast-[1.2] pointer-events-none"
        loading="eager"
      />
      {/* Subtle grid pattern & glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[rgba(32,178,170,0.12)] rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[rgba(59,130,246,0.08)] rounded-full blur-[90px] pointer-events-none" />

      {/* ── Top Bar: Active Agent Session & Tab Badges ── */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[rgba(32,178,170,0.15)] border border-[rgba(32,178,170,0.3)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
            <Sparkles size={13} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">
                Atlas Copilot
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-[rgba(34,197,94,0.12)] text-[var(--status-success)] border border-[rgba(34,197,94,0.25)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse mr-1" />
                Live RAG
              </span>
            </div>
            <span className="text-[10.5px] text-[var(--text-muted)] font-mono">
              {scenario.category}
            </span>
          </div>
        </div>

        {/* Scenario Selector Pills */}
        <div className="flex items-center gap-1 bg-[rgba(0,0,0,0.4)] p-0.5 rounded-lg border border-[rgba(255,255,255,0.06)]">
          {SCENARIOS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setScenarioIndex(idx)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                scenarioIndex === idx
                  ? "bg-[rgba(255,255,255,0.12)] text-[var(--text-primary)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {idx === 0 ? "Architecture" : idx === 1 ? "Finance" : "Security"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Chat Stream Display ── */}
      <div className="relative z-10 flex-1 my-3 flex flex-col justify-between overflow-hidden gap-3">
        {/* Messages Container */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {/* User Message Bubble */}
          <div className="flex items-start justify-end gap-2.5 transition-all duration-300">
            <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[rgba(32,178,170,0.12)] border border-[rgba(32,178,170,0.28)] px-3.5 py-2.5 shadow-md">
              <p className="text-[12.5px] leading-relaxed text-[var(--text-primary)] font-normal">
                {typedPrompt}
                {phase === "typing-prompt" && (
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[var(--accent-primary)] animate-pulse align-middle" />
                )}
              </p>
              <div className="flex items-center justify-end gap-1.5 mt-1 text-[9.5px] text-[rgba(32,178,170,0.7)] font-mono">
                <FileText size={10} />
                <span>{scenario.linkedDocs}</span>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[var(--accent-primary)] to-[#48d1cc] flex items-center justify-center text-black font-semibold text-[10px] shadow-sm flex-shrink-0 mt-0.5">
              U
            </div>
          </div>

          {/* Agent Status or Response Bubble */}
          {(phase === "thinking" || phase === "streaming" || phase === "completed") && (
            <div className="flex items-start gap-2.5 transition-all duration-300">
              <div className="w-6 h-6 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] flex items-center justify-center p-1 flex-shrink-0 mt-0.5 shadow-sm overflow-hidden">
                <img src="/logo.png" alt="Atlas" className="w-3.5 h-3.5 object-contain" />
              </div>

              <div className="flex-1 max-w-[92%] rounded-2xl rounded-tl-xs bg-[rgba(18,20,24,0.85)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] p-3.5 shadow-xl flex flex-col gap-2.5">
                {/* Thinking step indicator */}
                {phase === "thinking" && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="relative flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
                    </div>
                    <span className="text-[11.5px] text-[var(--accent-primary)] font-medium animate-pulse">
                      {scenario.steps[currentStepIdx]}
                    </span>
                  </div>
                )}

                {/* Streamed text */}
                {(phase === "streaming" || phase === "completed") && (
                  <div>
                    <p className="text-[12.5px] leading-relaxed text-[var(--text-primary)]">
                      {displayedResponse}
                      {phase === "streaming" && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[var(--accent-primary)] animate-pulse align-middle" />
                      )}
                    </p>

                    {/* Optional Financial KPI cards */}
                    {scenario.metrics && showCitations && (
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.06)]">
                        {scenario.metrics.map((m, idx) => (
                          <div
                            key={idx}
                            className="bg-[rgba(255,255,255,0.04)] rounded-lg p-2 border border-[rgba(255,255,255,0.05)] flex flex-col gap-0.5"
                          >
                            <span className="text-[9.5px] text-[var(--text-muted)] uppercase tracking-wider font-mono">
                              {m.label}
                            </span>
                            <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1">
                              {m.value}
                              {m.positive && <TrendingUp size={11} className="text-[var(--status-success)]" />}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Citations / Grounding Pills */}
                    {showCitations && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                        <span className="text-[10px] text-[var(--text-muted)] font-mono mr-1">
                          Sources:
                        </span>
                        {scenario.citations.map((c, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] bg-[rgba(32,178,170,0.08)] hover:bg-[rgba(32,178,170,0.15)] text-[var(--text-secondary)] border border-[rgba(32,178,170,0.2)] px-2 py-0.5 rounded-md transition-colors"
                          >
                            <CheckCircle2 size={10} className="text-[var(--accent-primary)]" />
                            <span className="font-medium text-[var(--text-primary)] truncate max-w-[130px]">
                              {c.name}
                            </span>
                            <span className="text-[9px] text-[var(--accent-primary)] font-mono">
                              {c.page}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Bar: Interactive Simulated Input Box ── */}
      <div className="relative z-10 pt-2 border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between gap-2 bg-[rgba(10,12,14,0.7)] backdrop-blur-md rounded-xl border border-[rgba(255,255,255,0.08)] px-3 py-2">
          <div className="flex items-center gap-2 flex-1 text-xs">
            <Search size={13} className="text-[var(--text-muted)] flex-shrink-0" />
            <span className="text-[11.5px] text-[var(--text-muted)] truncate">
              {phase === "typing-prompt"
                ? "Formulating query across workspace..."
                : phase === "thinking"
                ? "Synthesizing answer with citations..."
                : "Ask any question about your documents..."}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-[var(--text-muted)] font-mono px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)]">
              ⌘K
            </span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                phase === "sending"
                  ? "bg-[var(--accent-primary)] text-black scale-95"
                  : "bg-[rgba(255,255,255,0.08)] text-[var(--text-secondary)]"
              }`}
            >
              <ArrowUp size={12} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
