import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAppOrigin } from "@/lib/app-url";
import { deleteFile, isVercelBlobConfigured, saveFile, StorageProvider } from "@/lib/storage";
import {
  calculateExpiration,
  generateDropCode,
  generateSenderToken,
  hashPassword,
} from "@/lib/utils";
import { ExpirationOption, CreateDropResult } from "@/types/drop";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let storedFile: { key: string; provider: StorageProvider } | null = null;

  try {
    const isDirectUpload =
      request.headers.get("content-type")?.includes("application/json") ?? false;
    const formData = isDirectUpload ? null : await request.formData();
    const payload = isDirectUpload
      ? ((await request.json()) as Record<string, unknown>)
      : null;
    const getField = (name: string): string | null => {
      const value = isDirectUpload ? payload?.[name] : formData?.get(name);
      return typeof value === "string" || typeof value === "number"
        ? String(value)
        : null;
    };
    const file = isDirectUpload ? null : (formData?.get("file") as File | null);

    if (!isDirectUpload && !file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Read form options
    const expirationOption = (getField("expiration") as ExpirationOption) || "24h";
    const maxDownloadsRaw = getField("maxDownloads");
    const password = getField("password")?.trim() || null;

    let maxDownloads: number | null = null;
    if (maxDownloadsRaw && maxDownloadsRaw !== "unlimited") {
      const parsed = parseInt(maxDownloadsRaw.toString(), 10);
      if (!isNaN(parsed) && parsed > 0) {
        maxDownloads = parsed;
      }
    }

    const originalName = getField("fileName") || file?.name || "download";
    const fileSize = isDirectUpload
      ? Number(payload?.fileSize)
      : file?.size ?? 0;
    const mimeType =
      getField("mimeType") || file?.type || "application/octet-stream";
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (
      !Number.isSafeInteger(fileSize) ||
      fileSize < 0 ||
      fileSize > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        { error: "File exceeds maximum upload size (100MB)" },
        { status: 400 }
      );
    }

    let storageKey: string;
    let storageProvider: StorageProvider;

    if (isDirectUpload) {
      const blobUrl = getField("blobUrl");
      let blobHost = "";
      try {
        blobHost = blobUrl ? new URL(blobUrl).hostname : "";
      } catch {
        // The URL validation below returns a client error.
      }
      if (
        !blobUrl ||
        !blobHost.endsWith(".public.blob.vercel-storage.com") ||
        !isVercelBlobConfigured()
      ) {
        return NextResponse.json(
          { error: "The uploaded file is not a valid Vercel Blob." },
          { status: 400 }
        );
      }
      storageKey = blobUrl;
      storageProvider = "blob";
      storedFile = { key: storageKey, provider: storageProvider };
    } else {
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      const ext = originalName.includes(".")
        ? `.${originalName.split(".").pop()}`
        : "";
      const key = `${Date.now()}-${generateDropCode()}${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const saved = await saveFile(key, buffer, mimeType);
      storageKey = saved.storageKey;
      storageProvider = saved.storageProvider;
      storedFile = { key: storageKey, provider: storageProvider };
    }

    // Generate unique code
    let code = generateDropCode();
    let existing = await prisma.drop.findUnique({ where: { code } });
    let attempts = 0;
    while (existing && attempts < 5) {
      code = generateDropCode();
      existing = await prisma.drop.findUnique({ where: { code } });
      attempts++;
    }

    // Hash password if given
    let passwordHash: string | null = null;
    let hasPassword = false;
    if (password && password.length > 0) {
      passwordHash = await hashPassword(password);
      hasPassword = true;
    }

    const expiresAt = calculateExpiration(expirationOption);
    const senderToken = generateSenderToken();

    // Persist in DB
    const drop = await prisma.drop.create({
      data: {
        code,
        fileName: originalName,
        fileSize,
        mimeType,
        storageKey,
        storageProvider,
        passwordHash,
        hasPassword,
        maxDownloads,
        downloadCount: 0,
        expiresAt,
        senderToken,
      },
    });
    storedFile = null;

    // Share URL
    const shareUrl = `${getAppOrigin(request.nextUrl.origin)}/d/${drop.code}`;

    const result: CreateDropResult = {
      code: drop.code,
      shareUrl,
      fileName: drop.fileName,
      fileSize: drop.fileSize,
      expiresAt: drop.expiresAt.toISOString(),
      maxDownloads: drop.maxDownloads,
      hasPassword: drop.hasPassword,
      senderToken: drop.senderToken,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    if (storedFile) {
      await deleteFile(storedFile.key, storedFile.provider);
    }
    console.error("Error creating drop:", err);
    return NextResponse.json(
      { error: "Failed to create drop. Please try again." },
      { status: 500 }
    );
  }
}
