import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * Client-upload handler para las fotos del catálogo de tipos de evento.
 * El navegador sube directo al Blob CDN — sin límite de body de Next.js.
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
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"],
        maximumSizeInBytes: 20 * 1024 * 1024,
        tokenPayload: JSON.stringify({ userId: session.id, pathname }),
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log("[tipos-evento/imagenes] Upload completed:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[tipos-evento/imagenes] Token error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
