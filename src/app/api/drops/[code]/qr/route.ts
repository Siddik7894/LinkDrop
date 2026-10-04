import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import prisma from "@/lib/prisma";
import { getAppOrigin } from "@/lib/app-url";

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
        { error: "Drop not found" },
        { status: 404 }
      );
    }

    const shareUrl = `${getAppOrigin(request.nextUrl.origin)}/d/${drop.code}`;

    const dataUrl = await QRCode.toDataURL(shareUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    return NextResponse.json({ dataUrl, shareUrl });
  } catch (err: unknown) {
    console.error("Error generating QR code:", err);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
