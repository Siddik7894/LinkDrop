"use client";

import Link from "next/link";
import { ShieldCheck, Sparkles, Zap, ArrowDownToLine, Clock } from "lucide-react";

interface HeaderProps {
  activeTab?: "upload" | "receive" | "recent";
  onTabChange?: (tab: "upload" | "receive" | "recent") => void;
  recentCount?: number;
}

export function Header({
  activeTab = "upload",
  onTabChange,
  recentCount = 0,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group cursor-pointer"
          onClick={() => onTabChange?.("upload")}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                LinkDrop
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1.0
              </span>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Self-Destructing File Sharing
            </span>
          </div>
        </Link>

        {/* Tab navigation if callback is provided */}
        {onTabChange && (
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 text-xs font-medium">
            <button
              onClick={() => onTabChange("upload")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "upload"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>

            <button
              onClick={() => onTabChange("receive")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "receive"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Receive</span>
            </button>

            <button
              onClick={() => onTabChange("recent")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all relative cursor-pointer ${
                activeTab === "recent"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>History</span>
              {recentCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-400/20 text-indigo-300 border border-indigo-400/30 text-[10px] flex items-center justify-center font-bold">
                  {recentCount}
                </span>
              )}
            </button>
          </nav>
        )}

        {/* Security badge */}
        <div className="hidden md:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero-Trace Ephemeral</span>
        </div>
      </div>
    </header>
  );
}
