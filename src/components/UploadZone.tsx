"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { upload } from "@vercel/blob/client";
import {
  UploadCloud,
  File as FileIcon,
  X,
  Lock,
  Eye,
  EyeOff,
  Flame,
  Clock,
  Download,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { ExpirationOption, DownloadLimitOption, CreateDropResult } from "@/types/drop";
import { formatBytes } from "@/lib/client-utils";

interface UploadZoneProps {
  onSuccess: (result: CreateDropResult) => void;
}

const EXPIRATION_OPTIONS: { label: string; value: ExpirationOption }[] = [
  { label: "10 Min", value: "10m" },
  { label: "1 Hour", value: "1h" },
  { label: "24 Hours", value: "24h" },
  { label: "3 Days", value: "3d" },
  { label: "7 Days", value: "7d" },
];

const DOWNLOAD_LIMITS: { label: string; value: DownloadLimitOption; isBurn?: boolean }[] = [
  { label: "1 (Burn)", value: 1, isBurn: true },
  { label: "3 Downloads", value: 3 },
  { label: "5 Downloads", value: 5 },
  { label: "10 Downloads", value: 10 },
  { label: "Unlimited", value: "unlimited" },
];

export function UploadZone({ onSuccess }: UploadZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expiration, setExpiration] = useState<ExpirationOption>("24h");
  const [downloadLimit, setDownloadLimit] = useState<DownloadLimitOption>("unlimited");
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setErrorMessage(null);
    if (selectedFile.size > 100 * 1024 * 1024) {
      setErrorMessage("File exceeds the 100MB limit. Please choose a smaller file.");
      return;
    }
    setFile(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setErrorMessage("Please select a file to drop.");
      return;
    }

    if (enablePassword && (!password || password.trim().length === 0)) {
      setErrorMessage("Please enter a password or disable password protection.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(15);
    let progressTimer: ReturnType<typeof setInterval> | undefined;

    try {
      const configResponse = await fetch("/api/drops/upload-token", {
        cache: "no-store",
      });
      const uploadConfig = await configResponse.json();
      if (!configResponse.ok) {
        throw new Error(uploadConfig.error || "File storage is not configured.");
      }

      let res: Response;
      if (uploadConfig.directUpload) {
        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload";
        const blob = await upload(
          `drops/${Date.now()}-${safeFileName}`,
          file,
          {
            access: "public",
            contentType: file.type || "application/octet-stream",
            handleUploadUrl: "/api/drops/upload-token",
            multipart: file.size > 4 * 1024 * 1024,
            onUploadProgress: ({ percentage }) => {
              setUploadProgress(Math.min(85, Math.round(percentage * 0.85)));
            },
          }
        );

        setUploadProgress(90);
        res = await fetch("/api/drops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blobUrl: blob.url,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
            expiration,
            maxDownloads: downloadLimit.toString(),
            password: enablePassword ? password.trim() : null,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("expiration", expiration);
        formData.append("maxDownloads", downloadLimit.toString());
        if (enablePassword && password.trim()) {
          formData.append("password", password.trim());
        }

        progressTimer = setInterval(() => {
          setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
        }, 200);

        res = await fetch("/api/drops", {
          method: "POST",
          body: formData,
        });
      }

      if (progressTimer) clearInterval(progressTimer);
      setUploadProgress(100);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      onSuccess(data);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        className={`relative group rounded-3xl p-8 transition-all duration-300 border-2 cursor-pointer ${
          isDragging
            ? "border-indigo-500 bg-indigo-950/20 shadow-2xl shadow-indigo-500/20 scale-[1.01]"
            : file
            ? "border-slate-800 bg-slate-900/60 shadow-xl"
            : "border-dashed border-slate-700 hover:border-indigo-400/70 bg-slate-900/30 hover:bg-slate-900/60 shadow-lg"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {!file ? (
          <div className="flex flex-col items-center justify-center text-center py-10 px-4">
            <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:border-indigo-500/40 transition-all duration-300 shadow-inner">
              <UploadCloud className="w-10 h-10 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">
              Drag & Drop your file here
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mb-5">
              or <span className="text-indigo-400 font-semibold underline underline-offset-4">browse files</span> from your computer. Max 100MB per drop.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Self-destructing
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-500" /> Optional password
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-500" /> Auto-expires
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <FileIcon className="w-7 h-7 text-indigo-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-base text-slate-100 truncate">
                  {file.name}
                </span>
                <span className="text-xs text-slate-400">
                  {formatBytes(file.size)} • {file.type || "Unknown type"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Remove file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Options Panel */}
      <div className="glass-panel rounded-3xl p-6 flex flex-col gap-6 shadow-xl">
        {/* Expiration Options */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Link Expiration</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {EXPIRATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setExpiration(opt.value)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  expiration === opt.value
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Download Limits (Burn after reading) */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Download Limit (Burn After Reading)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {DOWNLOAD_LIMITS.map((lim) => (
              <button
                key={lim.value.toString()}
                type="button"
                onClick={() => setDownloadLimit(lim.value)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  downloadLimit === lim.value
                    ? lim.isBurn
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/10 font-bold"
                      : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/10"
                    : lim.isBurn
                    ? "bg-slate-900/60 text-rose-400/80 border-slate-800 hover:border-rose-900/40"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {lim.isBurn && <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                <span>{lim.label}</span>
              </button>
            ))}
          </div>
          {downloadLimit === 1 && (
            <p className="text-[11px] text-rose-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              File will be permanently deleted immediately after the first download.
            </p>
          )}
        </div>

        {/* Password Protection */}
        <div className="flex flex-col gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Password Protection</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setEnablePassword(!enablePassword);
                if (enablePassword) setPassword("");
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                enablePassword ? "bg-emerald-600" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 ${
                  enablePassword ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {enablePassword && (
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter secret password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 pr-10"
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
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-2xl p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Submit Action */}
      <button
        type="button"
        disabled={!file || isUploading}
        onClick={handleSubmit}
        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer ${
          !file || isUploading
            ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40"
            : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01]"
        }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Encrypting & Dropping File ({uploadProgress}%)...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Create Drop & Get Share Link</span>
          </>
        )}
      </button>
    </div>
  );
}
