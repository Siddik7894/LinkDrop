"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  File as FileIcon,
  Sparkles,
  Loader2,
} from "lucide-react";
import { StoredLocalDrop } from "@/types/drop";
import { formatBytes, formatTimeRemaining } from "@/lib/client-utils";

interface RecentDropsProps {
  drops: StoredLocalDrop[];
  onDropRevoked: (code: string) => void;
  onClearHistory: () => void;
}

export function RecentDrops({
  drops,
  onDropRevoked,
  onClearHistory,
}: RecentDropsProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [revokingCode, setRevokingCode] = useState<string | null>(null);

  const handleCopy = async (code: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleRevoke = async (drop: StoredLocalDrop) => {
    if (
      !confirm(
        `Are you sure you want to revoke and permanently shred "${drop.fileName}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setRevokingCode(drop.code);
    try {
      const res = await fetch(`/api/drops/${drop.code}`, {
        method: "DELETE",
        headers: {
          "x-sender-token": drop.senderToken,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to revoke drop");
      }

      onDropRevoked(drop.code);
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Failed to revoke drop. Please try again."
      );
    } finally {
      setRevokingCode(null);
    }
  };

  if (drops.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto glass-panel rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-4 border border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
          <Clock className="w-7 h-7" />
        </div>
        <h4 className="text-lg font-bold text-white">No drops created yet</h4>
        <p className="text-xs text-slate-400 max-w-sm">
          When you upload files, they will appear here along with their expiration timers and revocation controls.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-white">My Active Drops</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {drops.length}
          </span>
        </div>
        <button
          onClick={onClearHistory}
          className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
        >
          Clear History
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {drops.map((drop) => {
          const isExpired = new Date(drop.expiresAt).getTime() <= Date.now();
          const isRevoking = revokingCode === drop.code;

          return (
            <div
              key={drop.code}
              className="glass-panel-interactive rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800/80"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-slate-200 truncate">
                    {drop.fileName}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{formatBytes(drop.fileSize)}</span>
                    <span>•</span>
                    <span className="font-mono text-indigo-400 uppercase font-semibold">
                      {drop.code}
                    </span>
                    <span>•</span>
                    <span
                      className={`flex items-center gap-1 ${
                        isExpired ? "text-rose-400" : "text-cyan-400"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {formatTimeRemaining(drop.expiresAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {/* Copy Link */}
                <button
                  type="button"
                  onClick={() => handleCopy(drop.code, drop.shareUrl)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all cursor-pointer ${
                    copiedCode === drop.code
                      ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30"
                      : "bg-slate-900 text-slate-300 border-slate-700/60 hover:bg-slate-800"
                  }`}
                  title="Copy share link"
                >
                  {copiedCode === drop.code ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Link</span>
                    </>
                  )}
                </button>

                {/* View Drop Page */}
                <Link
                  href={`/d/${drop.code}`}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-slate-300 border border-slate-700/60 hover:bg-slate-800 flex items-center gap-1 transition-all"
                  title="Open download page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View</span>
                </Link>

                {/* Revoke Drop Button */}
                <button
                  type="button"
                  disabled={isRevoking}
                  onClick={() => handleRevoke(drop)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 flex items-center gap-1 transition-all cursor-pointer"
                  title="Revoke and shred file now"
                >
                  {isRevoking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Revoke</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
