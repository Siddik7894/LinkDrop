import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getFile, deleteFile } from "@/lib/storage";
import { verifyPassword } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const drop = await prisma.drop.findUnique({
      where: { code: code.toLowerCase() },
    });

    if (!drop) {
      return NextResponse.json(
        { error: "Drop not found or expired" },
        { status: 404 }
      );
    }

    if (drop.isRevoked) {
      return NextResponse.json(
        { error: "This drop has been revoked by the sender" },
        { status: 410 }
      );
    }

    // Check expiration
    if (new Date(drop.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "This drop has expired" },
        { status: 410 }
      );
    }

    // Check download limit
    if (drop.maxDownloads !== null && drop.downloadCount >= drop.maxDownloads) {
      return NextResponse.json(
        { error: "Download limit reached. This file has been burned." },
        { status: 410 }
      );
    }

    // Check password if required
    if (drop.hasPassword && drop.passwordHash) {
      const password =
        request.nextUrl.searchParams.get("password") ||
        request.headers.get("x-drop-password");

      if (!password) {
        return NextResponse.json(
          { error: "Password required to download this file" },
          { status: 401 }
        );
      }

      const isValid = await verifyPassword(password, drop.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Incorrect password" },
          { status: 401 }
        );
      }
    }

    // Increment download count
    const updatedCount = drop.downloadCount + 1;
    await prisma.drop.update({
      where: { id: drop.id },
      data: { downloadCount: updatedCount },
    });

    // Get file from storage
    const buffer = await getFile(
      drop.storageKey,
      drop.storageProvider as "local" | "s3"
    );

    if (!buffer) {
      return NextResponse.json(
        { error: "File data not found on server" },
        { status: 404 }
      );
    }

    // If this was the last allowed download, delete file immediately (burn after reading)
    if (drop.maxDownloads !== null && updatedCount >= drop.maxDownloads) {
      deleteFile(drop.storageKey, drop.storageProvider as "local" | "s3").catch(
        (err) => console.error("Failed to delete burned file:", err)
      );
    }

    // Sanitize filename for header
    const sanitizedFileName = encodeURIComponent(drop.fileName).replace(
      /['()]/g,
      escape
    );

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": drop.mimeType || "application/octet-stream",
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `attachment; filename="${sanitizedFileName}"; filename*=UTF-8''${sanitizedFileName}`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("Error downloading file:", err);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
