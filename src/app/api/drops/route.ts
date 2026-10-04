import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAppOrigin } from "@/lib/app-url";
import { saveFile } from "@/lib/storage";
import {
  calculateExpiration,
  generateDropCode,
  generateSenderToken,
  hashPassword,
} from "@/lib/utils";
import { ExpirationOption, CreateDropResult } from "@/types/drop";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Read form options
    const expirationOption = (formData.get("expiration") as ExpirationOption) || "24h";
    const maxDownloadsRaw = formData.get("maxDownloads");
    const password = (formData.get("password") as string | null)?.trim() || null;

    let maxDownloads: number | null = null;
    if (maxDownloadsRaw && maxDownloadsRaw !== "unlimited") {
      const parsed = parseInt(maxDownloadsRaw.toString(), 10);
      if (!isNaN(parsed) && parsed > 0) {
        maxDownloads = parsed;
      }
    }

    // Limit file size (e.g. 100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum upload size (100MB)" },
        { status: 400 }
      );
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

    // Storage key with extension preserved
    const originalName = file.name || "download";
    const ext = originalName.includes(".") ? `.${originalName.split(".").pop()}` : "";
    const storageKey = `${Date.now()}-${code}${ext}`;

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save file
    const { storageProvider } = await saveFile(
      storageKey,
      buffer,
      file.type || "application/octet-stream"
    );

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
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
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
    console.error("Error creating drop:", err);
    return NextResponse.json(
      { error: "Failed to create drop. Please try again." },
      { status: 500 }
    );
  }
}
