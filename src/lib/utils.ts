import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ExpirationOption, DropPublicMetadata } from "@/types/drop";

/**
 * Calculates expiration timestamp based on option.
 */
export function calculateExpiration(option: ExpirationOption = "24h"): Date {
  const now = Date.now();
  switch (option) {
    case "10m":
      return new Date(now + 10 * 60 * 1000);
    case "1h":
      return new Date(now + 60 * 60 * 1000);
    case "24h":
      return new Date(now + 24 * 60 * 60 * 1000);
    case "3d":
      return new Date(now + 3 * 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now + 24 * 60 * 60 * 1000);
  }
}

/**
 * Generates a clean, unambiguous 6-character short code.
 */
export function generateDropCode(length = 6): string {
  const chars = "23456789abcdefghjkmnpqrstuvwxyz";
  let code = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

/**
 * Generates a secret token for the sender to manage/revoke their drop.
 */
export function generateSenderToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * Hash password with bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Verify password with bcrypt.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Format bytes to readable size (e.g., 2.4 MB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format remaining time relative to current date.
 */
export function formatTimeRemaining(expiresAt: string | Date): string {
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - Date.now();

  if (diff <= 0) return "Expired";

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ${hours % 24}h remaining`;
  if (hours > 0) return `${hours}h ${minutes % 60}m remaining`;
  return `${minutes}m remaining`;
}

/**
 * Serialize a database drop record into safe public metadata.
 */
export function toPublicMetadata(drop: {
  code: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  hasPassword: boolean;
  maxDownloads: number | null;
  downloadCount: number;
  expiresAt: Date | string;
  isRevoked: boolean;
}): DropPublicMetadata {
  const expiresAtDate = new Date(drop.expiresAt);
  const isExpired = expiresAtDate.getTime() <= Date.now();
  const isBurned =
    drop.maxDownloads !== null && drop.downloadCount >= drop.maxDownloads;
  const remainingDownloads =
    drop.maxDownloads !== null
      ? Math.max(0, drop.maxDownloads - drop.downloadCount)
      : null;

  return {
    code: drop.code,
    fileName: drop.fileName,
    fileSize: drop.fileSize,
    mimeType: drop.mimeType,
    hasPassword: drop.hasPassword,
    maxDownloads: drop.maxDownloads,
    downloadCount: drop.downloadCount,
    remainingDownloads,
    expiresAt: expiresAtDate.toISOString(),
    isExpired,
    isBurned,
    isRevoked: drop.isRevoked,
  };
}
