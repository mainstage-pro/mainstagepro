import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * Client-upload handler for Vercel Blob.
 * The browser uploads directly to Blob CDN — no Next.js body size limit.
 * See: https://vercel.com/docs/storage/vercel-blob/client-upload
 */
export async function POST(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Only allow image uploads
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"],
          maximumSizeInBytes: 20 * 1024 * 1024, // 20MB — camera photos can be large
          tokenPayload: JSON.stringify({ userId: session.id, pathname }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Optional: log or record in DB
        console.log("[blob] Upload completed:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[presentaciones-venta/imagenes] Token error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
