// Enlace público de los documentos del proyecto.
//
// Sirve el MISMO PDF que descarga el equipo desde la tarjeta de Documentos,
// pero en línea (Content-Disposition: inline) y sin sesión. Se regenera en cada
// visita, así que el enlace siempre refleja el proyecto como está hoy: quien lo
// tenga no necesita que le reenvíen nada cuando algo cambia.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTokenExpired } from "@/lib/tokens";
import { DOCUMENTOS_PDF, esSlugDocumento, respuestaPdf } from "@/lib/pdf-proyecto";
import { bloqueosDocumento } from "@/lib/proyecto-documentos-guard";

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function aviso(titulo: string, detalle: string, status: number, puntos: string[] = []) {
  const lista = puntos.length
    ? `<ul>${puntos.map(p => `<li>${escapar(p)}</li>`).join("")}</ul>`
    : "";
  return new NextResponse(
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(titulo)}</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#0a0a0a;color:#e5e5e5;font-family:system-ui,-apple-system,sans-serif;padding:24px}
  main{max-width:420px;text-align:center}
  h1{font-size:17px;font-weight:600;margin:0 0 8px}
  p{font-size:13.5px;line-height:1.6;color:#8f8f8f;margin:0}
  ul{text-align:left;margin:16px 0 0;padding-left:20px;font-size:12.5px;color:#c7a869;line-height:1.7}
</style></head><body><main>
<h1>${escapar(titulo)}</h1><p>${escapar(detalle)}</p>${lista}
</main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; documento: string }> }
) {
  const { token, documento } = await params;

  if (!esSlugDocumento(documento)) {
    return aviso("Documento no encontrado", "El enlace apunta a un documento que no existe.", 404);
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { docsToken: token },
    select: { id: true, nombre: true },
  });

  if (!proyecto) {
    return aviso(
      "Enlace no válido",
      "Este enlace ya no existe o fue revocado. Pide uno nuevo a tu contacto en Mainstage Pro.",
      404
    );
  }

  if (isTokenExpired(token)) {
    return aviso(
      "Enlace expirado",
      "Por seguridad los enlaces de documentos caducan. Pide uno nuevo a tu contacto en Mainstage Pro.",
      410
    );
  }

  const doc = DOCUMENTOS_PDF[documento];

  const bloqueos = await bloqueosDocumento(proyecto.id, doc.tipo);
  if (bloqueos.length > 0) {
    return aviso(
      `${doc.label} todavía no está lista`,
      `Al proyecto "${proyecto.nombre}" le falta información para armar este documento:`,
      409,
      bloqueos
    );
  }

  const pdf = await doc.generar(proyecto.id);
  if (!pdf) return aviso("Documento no disponible", "El proyecto ya no existe.", 404);

  return respuestaPdf(pdf, true);
}
