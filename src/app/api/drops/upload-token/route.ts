import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { isVercelBlobConfigured } from "@/lib/storage";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function isVercelDeployment() {
  return Boolean(process.env.VERCEL_ENV || process.env.VERCEL_URL);
}

export async function GET() {
  if (!isVercelDeployment()) {
    return NextResponse.json({ directUpload: false });
  }

  if (!isVercelBlobConfigured()) {
    return NextResponse.json(
      {
        error:
          "Vercel Blob is required for uploads on this deployment. Attach a Blob store to the Vercel project and redeploy.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ directUpload: true });
}

export async function POST(request: NextRequest) {
  if (!isVercelBlobConfigured()) {
    return NextResponse.json(
      { error: "Vercel Blob storage is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => ({
        maximumSizeInBytes: MAX_FILE_SIZE,
        addRandomSuffix: true,
        validUntil: Date.now() + 10 * 60 * 1000,
      }),
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error preparing Vercel Blob upload:", error);
    return NextResponse.json(
      { error: "Could not prepare the file upload. Please try again." },
      { status: 400 }
    );
  }
}
