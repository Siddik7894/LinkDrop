"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  Lock,
  Eye,
  EyeOff,
  Flame,
  Clock,
  File as FileIcon,
  AlertCircle,
  CheckCircle,
  Home,
  RefreshCw,
  Loader2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { DropPublicMetadata } from "@/types/drop";
import { formatBytes } from "@/lib/client-utils";

interface DropViewerProps {
  code: string;
}

export function DropViewer({ code }: DropViewerProps) {
  const [metadata, setMetadata] = useState<DropPublicMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Remaining time live countdown in seconds
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const fetchMetadata = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/drops/${code}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Drop not found or expired");
      }

      setMetadata(data);

      const diff = Math.max(
        0,
        Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsRemaining(diff);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load drop details"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, [code]);

  // Live countdown timer ticker
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (metadata) {
            setMetadata({ ...metadata, isExpired: true });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining, metadata]);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return "Expired";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const handleDownload = async () => {
    setPasswordError(null);
    setIsDownloading(true);

    try {
      // If password protected, optionally verify first
      if (metadata?.hasPassword) {
        if (!password.trim()) {
          setPasswordError("Password is required to download this file.");
          setIsDownloading(false);
          return;
        }

        const verifyRes = await fetch(`/api/drops/${code}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        if (!verifyRes.ok) {
          const errData = await verifyRes.json().catch(() => ({}));
          throw new Error(errData.error || "Incorrect password");
        }
      }

      // Download file stream
      const downloadUrl = `/api/drops/${code}/download${
        password ? `?password=${encodeURIComponent(password)}` : ""
      }`;

      const res = await fetch(downloadUrl);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to download file");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = metadata?.fileName || "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadSuccess(true);

      // If single use, mark as burned locally
      if (metadata && metadata.maxDownloads === 1) {
        setMetadata({
          ...metadata,
          isBurned: true,
          downloadCount: metadata.downloadCount + 1,
          remainingDownloads: 0,
        });
      } else if (metadata && metadata.remainingDownloads !== null) {
        const newRem = metadata.remainingDownloads - 1;
        setMetadata({
          ...metadata,
          downloadCount: metadata.downloadCount + 1,
          remainingDownloads: newRem,
          isBurned: newRem <= 0,
        });
      }
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error ? err.message : "Download failed. Please try again."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto glass-panel rounded-3xl p-12 flex flex-col items-center justify-center gap-4 text-center border border-slate-800">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <span className="text-sm font-semibold text-slate-300">
          Decrypting & verifying drop metadata...
        </span>
      </div>
    );
  }

  // Not found / generic error
  if (error || !metadata) {
    return (
      <div className="w-full max-w-lg mx-auto glass-panel rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-6 border border-slate-800 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white">Drop Not Available</h2>
          <p className="text-sm text-slate-400">
            {error || "The requested link does not exist, has expired, or was already burned."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetadata}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/30"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Home</span>
          </Link>
        </div>
      </div>
    );
  }

  // Revoked State
  if (metadata.isRevoked) {
    return (
      <div className="w-full max-w-lg mx-auto glass-panel rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-6 border border-rose-500/20 glow-burn shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white">Drop Revoked</h2>
          <p className="text-sm text-slate-400">
            The sender has revoked this drop and the file was securely deleted from our servers.
          </p>
        </div>
        <Link
          href="/"
          className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  // Burned State (Download limit reached)
  if (metadata.isBurned) {
    return (
      <div className="w-full max-w-lg mx-auto glass-panel rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-6 border border-amber-500/30 glow-burn shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-bounce">
          <Flame className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <span>Drop Burned!</span>
            <Flame className="w-6 h-6 text-amber-500 inline" />
          </h2>
          <p className="text-sm text-slate-300 max-w-sm">
            This file had a burn-after-reading limit of{" "}
            <span className="font-semibold text-white">
              {metadata.maxDownloads} {metadata.maxDownloads === 1 ? "download" : "downloads"}
            </span>
            . It was downloaded and permanently shredded from the server.
          </p>
        </div>
        <Link
          href="/"
          className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  // Expired State
  if (metadata.isExpired) {
    return (
      <div className="w-full max-w-lg mx-auto glass-panel rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-6 border border-slate-800 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
          <Clock className="w-8 h-8 text-slate-500" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white">Drop Expired</h2>
          <p className="text-sm text-slate-400">
            This drop reached its expiration time and is no longer accessible.
          </p>
        </div>
        <Link
          href="/"
          className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  // Active Drop Available
  return (
    <div className="w-full max-w-lg mx-auto glass-panel rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl border border-indigo-500/20 glow-primary">
      {/* File Card Banner */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
          <FileIcon className="w-8 h-8" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">
            Ready to Download
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-white truncate" title={metadata.fileName}>
            {metadata.fileName}
          </h2>
          <span className="text-xs text-slate-400">
            {formatBytes(metadata.fileSize)} • Code:{" "}
            <span className="font-mono text-indigo-300 font-semibold uppercase">
              {metadata.code}
            </span>
          </span>
        </div>
      </div>

      {/* Badges / Metrics */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              Time Remaining
            </span>
            <span className="font-mono text-cyan-300 font-bold">
              {secondsRemaining !== null ? formatCountdown(secondsRemaining) : "Active"}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
          {metadata.maxDownloads ? (
            <Flame className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Download className="w-4 h-4 text-indigo-400 shrink-0" />
          )}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              Limit Status
            </span>
            <span
              className={`font-semibold ${
                metadata.maxDownloads ? "text-rose-300" : "text-indigo-300"
              }`}
            >
              {metadata.remainingDownloads !== null
                ? `${metadata.remainingDownloads} left`
                : "Unlimited"}
            </span>
          </div>
        </div>
      </div>

      {/* Burn warning if 1 download */}
      {metadata.maxDownloads === 1 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 text-xs text-rose-300 flex items-center gap-2.5">
          <Flame className="w-4 h-4 shrink-0 text-rose-400" />
          <span>
            <strong>Burn on read:</strong> This file will be permanently erased immediately after you download it.
          </span>
        </div>
      )}

      {/* Password Prompt if required */}
      {metadata.hasPassword && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Password Required</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter drop password..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(null);
              }}
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {passwordError && (
            <p className="text-xs text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{passwordError}</span>
            </p>
          )}
        </div>
      )}

      {/* Download Action */}
      <button
        type="button"
        disabled={isDownloading}
        onClick={handleDownload}
        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer ${
          isDownloading
            ? "bg-indigo-700 text-white cursor-wait"
            : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.01]"
        }`}
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Downloading File...</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            <span>Download ({formatBytes(metadata.fileSize)})</span>
          </>
        )}
      </button>

      {downloadSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 text-xs flex items-center gap-2 justify-center">
          <CheckCircle className="w-4 h-4" />
          <span>Download started successfully!</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/80">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted Transfer</span>
        </span>
        <Link href="/" className="hover:text-slate-300 transition-colors">
          Drop your own file →
        </Link>
      </div>
    </div>
  );
}
