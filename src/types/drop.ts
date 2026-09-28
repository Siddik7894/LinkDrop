export type ExpirationOption = '10m' | '1h' | '24h' | '3d' | '7d';
export type DownloadLimitOption = 1 | 3 | 5 | 10 | 'unlimited';

export interface DropRecord {
  id: string;
  code: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  storageProvider: 'local' | 's3';
  passwordHash?: string | null;
  hasPassword: boolean;
  maxDownloads?: number | null;
  downloadCount: number;
  expiresAt: string | Date;
  isRevoked: boolean;
  senderToken: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface DropPublicMetadata {
  code: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  hasPassword: boolean;
  maxDownloads: number | null;
  downloadCount: number;
  remainingDownloads: number | null;
  expiresAt: string;
  isExpired: boolean;
  isBurned: boolean;
  isRevoked: boolean;
}

export interface CreateDropResult {
  code: string;
  shareUrl: string;
  fileName: string;
  fileSize: number;
  expiresAt: string;
  maxDownloads: number | null;
  hasPassword: boolean;
  senderToken: string;
}

export interface StoredLocalDrop {
  code: string;
  fileName: string;
  fileSize: number;
  expiresAt: string;
  shareUrl: string;
  senderToken: string;
  createdAt: string;
}
