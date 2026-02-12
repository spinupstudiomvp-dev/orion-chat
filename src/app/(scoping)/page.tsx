"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatPanel from "@/components/scoping/ChatPanel";
import BriefPanel from "@/components/scoping/BriefPanel";
import LandingHero from "@/components/scoping/LandingHero";
import AuthModal from "@/components/scoping/AuthModal";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface BriefData {
  project_name?: string | null;
  project_type?: string | null;
  description?: string | null;
  problem?: string | null;
  target_users?: string | null;
  core_features?: string[];
  nice_to_have?: string[];
  design_notes?: string | null;
  tech_requirements?: string | null;
  integrations?: string[];
  timeline?: string | null;
  existing_assets?: string | null;
  complexity?: string | null;
  status?: "gathering" | "ready";
}

export default function ScopingPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [briefData, setBriefData] = useState<BriefData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showBriefMobile, setShowBriefMobile] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem("oc_scope_session");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("oc_scope_session", id);
    }
    setSessionId(id);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setHasStarted(true);
    setIsLoading(true);

    try {
      const res = await fetch("/api/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messages: newMessages }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const assistantMsg: Message = { role: "assistant", content: data.message };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.briefUpdate) {
        setBriefData((prev) => {
          const merged = { ...prev };
          for (const [k, v] of Object.entries(data.briefUpdate)) {
            if (v !== null && v !== undefined) {
              (merged as any)[k] = v;
            }
          }
          return merged;
        });
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, sessionId]);

  const handleSubmitBrief = () => {
    setShowAuth(true);
  };

  const handleAuthComplete = async (email: string) => {
    setShowAuth(false);
    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "https://hardy-mongoose-695.eu-west-1.convex.site";
      await fetch(`${convexUrl}/api/scope/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, email }),
      });
      setIsSubmitted(true);
    } catch {
      alert("Failed to submit. Please try again.");
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">🚀</div>
          <h1 className="text-3xl font-bold mb-4">Brief Submitted!</h1>
          <p className="text-gray-400 mb-6">
            Thanks for sharing your project idea. We&apos;ll review your brief and get back to you within 24 hours.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("oc_scope_session");
              setMessages([]);
              setBriefData({});
              setHasStarted(false);
              setIsSubmitted(false);
              setSessionId(crypto.randomUUID());
            }}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium transition-colors"
          >
            Start a New Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              <span className="text-emerald-500">●</span> Orián
            </span>
          </div>
          <div className="flex items-center gap-3">
            {hasStarted && (
              <button
                onClick={() => setShowBriefMobile(!showBriefMobile)}
                className="md:hidden px-3 py-1.5 text-sm bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                {showBriefMobile ? "Chat" : "Brief"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-14 h-screen">
        {!hasStarted ? (
          <LandingHero onSend={sendMessage} />
        ) : (
          <div className="flex h-[calc(100vh-3.5rem)]">
            {/* Chat panel */}
            <div className={`${showBriefMobile ? "hidden md:flex" : "flex"} flex-col flex-1 md:w-1/2 md:border-r md:border-gray-800/50`}>
              <ChatPanel
                messages={messages}
                isLoading={isLoading}
                onSend={sendMessage}
              />
            </div>
            {/* Brief panel */}
            <div className={`${showBriefMobile ? "flex" : "hidden md:flex"} flex-col flex-1 md:w-1/2`}>
              <BriefPanel
                briefData={briefData}
                isReady={briefData.status === "ready"}
                onSubmit={handleSubmitBrief}
              />
            </div>
          </div>
        )}
      </main>

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          onComplete={handleAuthComplete}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
