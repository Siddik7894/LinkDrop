/**
 * Client-safe utility functions.
 * These can be safely imported in "use client" components without
 * pulling in Node.js-only modules like crypto or bcryptjs.
 */

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
