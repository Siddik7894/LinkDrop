"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { UploadZone } from "@/components/UploadZone";
import { DropSuccessModal } from "@/components/DropSuccessModal";
import { ReceiveCodeCard } from "@/components/ReceiveCodeCard";
import { RecentDrops } from "@/components/RecentDrops";
import { CreateDropResult, StoredLocalDrop } from "@/types/drop";
import {
  Flame,
  ShieldCheck,
  QrCode,
  Clock,
  Sparkles,
  ArrowUpRight,
  Zap,
} from "lucide-react";

const LOCAL_STORAGE_KEY = "linkdrop_recent_drops";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"upload" | "receive" | "recent">("upload");
  const [recentDrops, setRecentDrops] = useState<StoredLocalDrop[]>([]);
  const [createdDrop, setCreatedDrop] = useState<CreateDropResult | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Load recent drops from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentDrops(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to load local drops:", err);
    }
  }, []);

  const saveRecentDrops = (drops: StoredLocalDrop[]) => {
    setRecentDrops(drops);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(drops));
    } catch (err) {
      console.error("Failed to save local drops:", err);
    }
  };

  const handleUploadSuccess = (result: CreateDropResult) => {
    setCreatedDrop(result);

    const newLocalDrop: StoredLocalDrop = {
      code: result.code,
      fileName: result.fileName,
      fileSize: result.fileSize,
      expiresAt: result.expiresAt,
      shareUrl: result.shareUrl,
      senderToken: result.senderToken,
      createdAt: new Date().toISOString(),
    };

    const updated = [newLocalDrop, ...recentDrops.filter((d) => d.code !== result.code)];
    saveRecentDrops(updated);
  };

  const handleDropRevoked = (code: string) => {
    const updated = recentDrops.filter((d) => d.code !== code);
    saveRecentDrops(updated);
    if (createdDrop && createdDrop.code === code) {
      setCreatedDrop(null);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Clear all drop history from this browser?")) {
      saveRecentDrops([]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Dynamic ambient background glows */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-indigo-600/20 via-cyan-500/10 to-transparent blur-[140px] pointer-events-none -z-10 animate-subtle-pulse" />
      <div className="absolute top-[400px] right-[-150px] w-[500px] h-[500px] bg-purple-600/10 blur-[130px] pointer-events-none -z-10" />

      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== "upload") {
            setCreatedDrop(null);
          }
        }}
        recentCount={isMounted ? recentDrops.length : 0}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-14 flex flex-col gap-10">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zero-Trace Ephemeral File Sharing</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.15]">
            Drop Files.{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              Share Instantly.
            </span>
            <br />
            Self-Destruct on Demand.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
            Drop any file up to 100MB, set a self-destruct timer or burn-after-reading limit, encrypt with a password, and share via private link or instant QR code.
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Burn on read</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Password lock</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl">
              <QrCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>QR Code ready</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>10m to 7d expiry</span>
            </span>
          </div>
        </section>

        {/* Tab Views */}
        <section className="w-full">
          {activeTab === "upload" && (
            <>
              {createdDrop ? (
                <DropSuccessModal
                  drop={createdDrop}
                  onReset={() => setCreatedDrop(null)}
                />
              ) : (
                <UploadZone onSuccess={handleUploadSuccess} />
              )}
            </>
          )}

          {activeTab === "receive" && <ReceiveCodeCard />}

          {activeTab === "recent" && (
            <RecentDrops
              drops={recentDrops}
              onDropRevoked={handleDropRevoked}
              onClearHistory={handleClearHistory}
            />
          )}
        </section>

        {/* How It Works Grid */}
        <section className="pt-8 border-t border-slate-900/80">
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold text-white mb-1">
              How LinkDrop Protects Your Privacy
            </h2>
            <p className="text-xs text-slate-400">
              Built for secure, ephemeral file exchanges without accounts or trackers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-2xl p-6 flex flex-col gap-3 border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Flame className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="font-bold text-sm text-white">1. Burn After Reading</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Set a 1-download limit. Once the recipient downloads your file, it is automatically purged from the server immediately.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 flex flex-col gap-3 border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Clock className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="font-bold text-sm text-white">2. Automatic Expiration</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose between 10 minutes up to 7 days. Once the timer reaches zero, the link self-destructs and the data becomes inaccessible.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 flex flex-col gap-3 border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-bold text-sm text-white">3. Sender Revoke Control</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Shared the wrong file or want to cut access early? Use your unique sender token to shred the drop at any second.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900/80 py-8 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-400">LinkDrop</span>
            <span>&bull; Ephemeral & encrypted file sharing</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Local & S3 Storage Ready</span>
            <span>&bull;</span>
            <span>No Account Required</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
