import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Helper to determine if S3/R2 is configured
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

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

/**
 * Saves a file buffer to storage.
 * Uses S3/R2 in production, falls back to local filesystem in development.
 */
export async function saveFile(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ storageKey: string; storageProvider: "local" | "s3" }> {
  // Always prefer S3/R2 when configured (production)
  if (isS3Configured()) {
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

  // Local storage fallback (development only)
  const { fs, uploadDir } = await getLocalModules();
  const { join } = await import("path");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filePath = join(uploadDir, key);
  await fs.promises.writeFile(filePath, buffer);
  return { storageKey: key, storageProvider: "local" };
}

/**
 * Retrieves a file from storage as Buffer.
 */
export async function getFile(
  key: string,
  provider: "local" | "s3" = "local"
): Promise<Buffer | null> {
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

  // Local storage fallback
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

/**
 * Deletes a file from storage.
 */
export async function deleteFile(
  key: string,
  provider: "local" | "s3" = "local"
): Promise<void> {
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

  // Local storage fallback
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
