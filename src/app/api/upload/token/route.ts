import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Endpoint genérico de autorización para client upload de @vercel/blob
// El archivo sube directo del browser a Vercel Blob — sin pasar por las funciones serverless
// Esto elimina el límite de ~4.5 MB de Vercel Functions. Soporta archivos de hasta 500 MB.
//
// Módulos que lo usan:
//   - Marketing: /api/upload/token
//   - Proyectos archivos: /api/proyectos/[id]/archivos/token
//   - Tratos archivos: /api/tratos/[id]/archivos/token
//   - Tareas archivos: /api/tareas/[id]/archivos/token
//
// El cliente llama upload(pathname, file, { handleUploadUrl: "/api/upload/token" })

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: [
            // Imágenes
            "image/jpeg", "image/jpg", "image/png", "image/webp",
            "image/gif", "image/heic", "image/heif", "image/avif",
            // Documentos
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "text/csv",
            // Video
            "video/mp4", "video/quicktime", "video/mov", "video/avi",
            "video/webm", "video/x-msvideo",
            // Audio
            "audio/mpeg", "audio/mp4", "audio/wav",
            // Comprimidos
            "application/zip", "application/x-zip-compressed",
          ],
          tokenPayload: JSON.stringify({
            userId: session.id,
            userEmail: session.email,
            pathname,
          }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[upload/token] Completado:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[upload/token] Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
