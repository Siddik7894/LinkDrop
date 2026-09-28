import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteFile, StorageProvider } from "@/lib/storage";
import { toPublicMetadata } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
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

    return NextResponse.json(toPublicMetadata(drop));
  } catch (err: unknown) {
    console.error("Error fetching drop:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const senderToken =
      request.headers.get("x-sender-token") ||
      request.nextUrl.searchParams.get("token");

    if (!senderToken) {
      return NextResponse.json(
        { error: "Unauthorized: Missing sender token" },
        { status: 401 }
      );
    }

    const drop = await prisma.drop.findUnique({
      where: { code: code.toLowerCase() },
    });

    if (!drop) {
      return NextResponse.json(
        { error: "Drop not found" },
        { status: 404 }
      );
    }

    if (drop.senderToken !== senderToken) {
      return NextResponse.json(
        { error: "Forbidden: Invalid sender token" },
        { status: 403 }
      );
    }

    // Delete stored file
    await deleteFile(drop.storageKey, drop.storageProvider as StorageProvider);

    // Mark revoked in DB
    const updated = await prisma.drop.update({
      where: { id: drop.id },
      data: { isRevoked: true },
    });

    return NextResponse.json({
      success: true,
      message: "Drop has been revoked and file deleted",
      drop: toPublicMetadata(updated),
    });
  } catch (err: unknown) {
    console.error("Error revoking drop:", err);
    return NextResponse.json(
      { error: "Failed to revoke drop" },
      { status: 500 }
    );
  }
}
