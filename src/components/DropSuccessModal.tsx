"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Check,
  Copy,
  Download,
  Flame,
  Clock,
  Lock,
  QrCode,
  Share2,
  ExternalLink,
  PlusCircle,
} from "lucide-react";
import { CreateDropResult } from "@/types/drop";
import { formatBytes, formatTimeRemaining } from "@/lib/client-utils";

interface DropSuccessModalProps {
  drop: CreateDropResult;
  onReset: () => void;
}

export function DropSuccessModal({ drop, onReset }: DropSuccessModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(true);

  // Generate QR code via server-side API (avoids Node.js dependency on client)
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/drops/${drop.code}/qr`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.dataUrl) setQrDataUrl(data.dataUrl);
      })
      .catch((err) => console.error("Error loading QR code:", err));

    return () => {
      isMounted = false;
    };
  }, [drop.code]);

  const copyToClipboard = async (text: string, type: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `LinkDrop: ${drop.fileName}`,
          text: `Download ${drop.fileName} via secure LinkDrop:`,
          url: drop.shareUrl,
        });
      } catch {
        // User dismissed
      }
    } else {
      copyToClipboard(drop.shareUrl, "link");
    }
  };

  const downloadQrCode = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `linkdrop-${drop.code}-qr.png`;
    link.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto glass-panel rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl border border-indigo-500/20 glow-primary">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <Check className="w-6 h-6 stroke-[3]" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Drop Ready to Share!</span>
          </h2>
          <p className="text-xs text-slate-400">
            Anyone with this link or code can download your file until it expires.
          </p>
        </div>
      </div>

      {/* Share Link Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Shareable URL
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 flex items-center gap-1 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <a
              href={drop.shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 flex items-center gap-1 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open</span>
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-xl p-2 pl-3">
          <input
            type="text"
            readOnly
            value={drop.shareUrl}
            className="w-full bg-transparent text-sm text-indigo-300 font-mono focus:outline-none truncate"
          />
          <button
            onClick={() => copyToClipboard(drop.shareUrl, "link")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
              copiedLink
                ? "bg-emerald-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code and QR Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Short Code */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              6-Character Drop Code
            </span>
            <p className="text-xs text-slate-400">
              Can be typed directly on the home page.
            </p>
          </div>

          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
            <span className="font-mono text-2xl font-bold tracking-widest text-white uppercase">
              {drop.code}
            </span>
            <button
              onClick={() => copyToClipboard(drop.code, "code")}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                copiedCode
                  ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              }`}
              title="Copy drop code"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* QR Code toggle */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-between gap-3">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mobile QR Code</span>
            </span>
            <button
              onClick={() => setShowQr(!showQr)}
              className="text-xs text-indigo-400 hover:underline cursor-pointer"
            >
              {showQr ? "Hide" : "Show"}
            </button>
          </div>

          {showQr && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-36 h-36 bg-white p-2 rounded-xl shadow-lg relative flex items-center justify-center">
                {qrDataUrl ? (
                  <Image
                    src={qrDataUrl}
                    alt="QR Code"
                    width={130}
                    height={130}
                    className="rounded-lg"
                  />
                ) : (
                  <span className="text-xs text-slate-500">Generating QR...</span>
                )}
              </div>
              <button
                onClick={downloadQrCode}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Save QR Image</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drop Info Summary */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="font-semibold text-slate-100">{drop.fileName}</span>
          <span className="text-slate-500">({formatBytes(drop.fileSize)})</span>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{formatTimeRemaining(drop.expiresAt)}</span>
          </span>

          <span>•</span>

          <span className="flex items-center gap-1">
            {drop.maxDownloads === 1 ? (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> 1-time Burn
              </span>
            ) : drop.maxDownloads ? (
              <span>{drop.maxDownloads} downloads limit</span>
            ) : (
              <span>Unlimited downloads</span>
            )}
          </span>

          <span>•</span>

          <span className="flex items-center gap-1">
            <Lock
              className={`w-3.5 h-3.5 ${
                drop.hasPassword ? "text-emerald-400" : "text-slate-500"
              }`}
            />
            <span>{drop.hasPassword ? "Password protected" : "No password"}</span>
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <p className="text-[11px] text-slate-500">
          Drop saved in your browser history. You can revoke it anytime.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Drop Another File</span>
        </button>
      </div>
    </div>
  );
}
