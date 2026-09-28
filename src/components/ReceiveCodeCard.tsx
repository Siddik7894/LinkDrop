"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, AlertCircle, Sparkles } from "lucide-react";

export function ReceiveCodeCard() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleInput = (val: string) => {
    setError(null);
    let cleaned = val.trim();
    // If user pastes full URL like http://.../d/x9k2m4
    if (cleaned.includes("/d/")) {
      const parts = cleaned.split("/d/");
      cleaned = parts[parts.length - 1].split("/")[0].split("?")[0];
    }
    setCode(cleaned.toLowerCase());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toLowerCase();
    if (!cleanCode || cleanCode.length < 3) {
      setError("Please enter a valid drop code.");
      return;
    }
    router.push(`/d/${cleanCode}`);
  };

  return (
    <div className="w-full max-w-xl mx-auto glass-panel rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-xl border border-slate-800">
      <div className="flex flex-col gap-1 text-center sm:text-left">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
          <KeyRound className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white">Receive a Drop</h3>
        <p className="text-xs text-slate-400">
          Have a 6-character code or link from someone? Enter it below to claim and download the file.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative">
          <input
            type="text"
            value={code}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="e.g. 7m4x9b or paste share link"
            className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500/80 rounded-2xl px-5 py-4 text-base font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-center tracking-wider"
          />
        </div>

        {error && (
          <div className="text-xs text-rose-400 flex items-center gap-1.5 justify-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!code.trim()}
          className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
            !code.trim()
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.01]"
          }`}
        >
          <span>Claim & Download File</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-800/80">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        <span>Files are fetched directly and securely with end-to-end expiration checks.</span>
      </div>
    </div>
  );
}
