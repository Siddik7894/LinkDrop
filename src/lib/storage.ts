import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { put, del } from "@vercel/blob";

// ── Provider Detection ────────────────────────────────────────────────

export type StorageProvider = "local" | "s3" | "blob";

export function isVercelBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

/**
 * Returns the active storage provider in priority order:
 * 1. Vercel Blob (if BLOB_READ_WRITE_TOKEN is set)
 * 2. S3/R2 (if AWS credentials are set)
 * 3. Local filesystem (fallback for dev)
 */
export function getActiveProvider(): StorageProvider {
  if (isVercelBlobConfigured()) return "blob";
  if (isS3Configured()) return "s3";
  if (process.env.VERCEL_ENV || process.env.VERCEL_URL) {
    throw new Error(
      "Persistent storage is not configured for Vercel. Add a Vercel Blob store or S3 credentials."
    );
  }
  return "local";
}

// ── S3 Client (lazy singleton) ────────────────────────────────────────

let s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "auto",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
      // Cloudflare R2 requires an endpoint; S3 does not
      ...(process.env.AWS_ENDPOINT
        ? { endpoint: process.env.AWS_ENDPOINT, forcePathStyle: true }
        : {}),
    });
  }
  return s3Client;
}

// ── Local filesystem helpers (dev mode fallback) ──────────────────────
// Only imported lazily so they don't break on read-only serverless envs
async function getLocalModules() {
  const fs = await import("fs");
  const path = await import("path");
  const uploadDir = path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.LOCAL_UPLOAD_DIR || "./uploads"
  );
  return { fs, path, uploadDir };
}

// ── Save File ─────────────────────────────────────────────────────────

/**
 * Saves a file buffer to storage.
 * Uses Vercel Blob in production, S3/R2 if configured, or local filesystem.
 */
export async function saveFile(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ storageKey: string; storageProvider: StorageProvider }> {
  const provider = getActiveProvider();

  // ── Vercel Blob ──
  if (provider === "blob") {
    const blob = await put(key, buffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: false,
    });
    // Store the full blob URL as the storageKey so we can retrieve/delete it
    return { storageKey: blob.url, storageProvider: "blob" };
  }

  // ── S3 / R2 ──
  if (provider === "s3") {
    const client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET!;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return { storageKey: key, storageProvider: "s3" };
  }

  // ── Local storage fallback (development only) ──
  const { fs, uploadDir } = await getLocalModules();
  const { join } = await import("path");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filePath = join(uploadDir, key);
  await fs.promises.writeFile(filePath, buffer);
  return { storageKey: key, storageProvider: "local" };
}

// ── Get File ──────────────────────────────────────────────────────────

/**
 * Retrieves a file from storage as Buffer.
 */
export async function getFile(
  key: string,
  provider: StorageProvider = "local"
): Promise<Buffer | null> {
  // ── Vercel Blob ──
  if (provider === "blob") {
    try {
      // key is the full blob URL for blob provider
      const response = await fetch(key);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      console.error("Failed to retrieve file from Vercel Blob:", err);
      return null;
    }
  }

  // ── S3 / R2 ──
  if (provider === "s3" && isS3Configured()) {
    try {
      const client = getS3Client();
      const bucket = process.env.AWS_S3_BUCKET!;
      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      if (response.Body) {
        const byteArray = await response.Body.transformToByteArray();
        return Buffer.from(byteArray);
      }
    } catch (err) {
      console.error("Failed to retrieve file from S3:", err);
      return null;
    }
  }

  // ── Local storage ──
  try {
    const { fs, uploadDir } = await getLocalModules();
    const { join } = await import("path");
    const filePath = join(uploadDir, key);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return await fs.promises.readFile(filePath);
  } catch (err) {
    console.error("Failed to read local file:", err);
    return null;
  }
}

// ── Delete File ───────────────────────────────────────────────────────

/**
 * Deletes a file from storage.
 */
export async function deleteFile(
  key: string,
  provider: StorageProvider = "local"
): Promise<void> {
  // ── Vercel Blob ──
  if (provider === "blob") {
    try {
      // key is the full blob URL
      await del(key);
      return;
    } catch (err) {
      console.error("Failed to delete Vercel Blob file:", err);
    }
  }

  // ── S3 / R2 ──
  if (provider === "s3" && isS3Configured()) {
    try {
      const client = getS3Client();
      const bucket = process.env.AWS_S3_BUCKET!;
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      return; // Done — no need to touch local
    } catch (err) {
      console.error("Failed to delete S3 file:", err);
    }
  }

  // ── Local storage ──
  try {
    const { fs, uploadDir } = await getLocalModules();
    const { join } = await import("path");
    const filePath = join(uploadDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.warn("Failed to delete local file:", err);
  }
}

// ── Presigned URL (S3 only) ───────────────────────────────────────────

/**
 * Generates a presigned direct download URL for S3/R2 files.
 */
export async function getPresignedDownloadUrl(
  key: string,
  fileName: string
): Promise<string | null> {
  if (!isS3Configured()) return null;

  try {
    const client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET!;
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    });
    return await getSignedUrl(client, command, { expiresIn: 300 });
  } catch {
    return null;
  }
}
