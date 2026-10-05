import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * Client-upload de la imagen de fondo del site plan: una captura satelital o el
 * plano del venue. Sube directo al Blob CDN porque un plano en alta resolución
 * pasa de sobra el límite de body de Next.js.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
        maximumSizeInBytes: 30 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ userId: session.id, pathname }),
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log("[site-planes/fondo] Upload completed:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[site-planes/fondo] Token error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
