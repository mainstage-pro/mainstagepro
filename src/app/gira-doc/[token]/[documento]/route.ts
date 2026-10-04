// Enlace público de los documentos de una gira.
//
// Sirve el MISMO PDF que descarga el equipo desde la página de Documentos, pero
// en línea y sin sesión: el day sheet se abre en el teléfono del crew y el rider
// se le manda al foro sin pedirle que entre a ningún sistema. Se regenera en
// cada visita, así que el enlace siempre refleja la gira como está hoy.
//
// Un mismo token puede ser de show (GiraShow.docsToken) o de gira
// (Gira.portalToken). El de show abre los cuatro documentos; el de gira solo
// los que no dependen de una fecha, porque un day sheet sin show no existe.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTokenExpired } from "@/lib/tokens";
import {
  DOCUMENTOS_GIRA,
  esSlugDocGira,
  generarDocDeGira,
  generarDocDeShow,
  respuestaPdf,
} from "@/lib/pdf-gira";
import { fmtFechaLarga } from "@/lib/giras";

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function aviso(titulo: string, detalle: string, status: number, puntos: string[] = []) {
  const lista = puntos.length ? `<ul>${puntos.map((p) => `<li>${escapar(p)}</li>`).join("")}</ul>` : "";
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
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

const SIN_ENLACE = "Este enlace ya no existe o fue revocado. Pide uno nuevo a tu contacto en Mainstage Pro.";

export async function GET(req: Request, { params }: { params: Promise<{ token: string; documento: string }> }) {
  const { token, documento } = await params;
  const secciones = new URL(req.url).searchParams.get("secciones");

  if (!esSlugDocGira(documento)) {
    return aviso("Documento no encontrado", "El enlace apunta a un documento que no existe.", 404);
  }
  const doc = DOCUMENTOS_GIRA[documento];

  // Primero se busca como show: es el caso normal, el day sheet se comparte por
  // fecha. Si no es de show, se intenta como gira completa.
  const show = await prisma.giraShow.findUnique({
    where: { docsToken: token },
    select: { id: true, giraId: true, fecha: true, ciudad: true, gira: { select: { activo: true } } },
  });

  const gira = show
    ? null
    : await prisma.gira.findUnique({
        where: { portalToken: token },
        select: { id: true, nombre: true, activo: true },
      });

  if (!show && !gira) return aviso("Enlace no válido", SIN_ENLACE, 404);
  if ((show && !show.gira.activo) || (gira && !gira.activo)) {
    return aviso("Enlace no válido", SIN_ENLACE, 404);
  }

  if (isTokenExpired(token)) {
    return aviso(
      "Enlace expirado",
      "Por seguridad los enlaces de documentos caducan. Pide uno nuevo a tu contacto en Mainstage Pro.",
      410,
    );
  }

  if (show) {
    const pdf = await generarDocDeShow(documento, show.id, show.giraId, secciones);
    if (!pdf) {
      return aviso(
        `${doc.label} todavía no se puede armar`,
        `Al show del ${fmtFechaLarga(show.fecha)}${show.ciudad ? ` en ${show.ciudad}` : ""} le falta información para este documento.`,
        409,
      );
    }
    return respuestaPdf(pdf, true);
  }

  if (doc.ambito === "SHOW") {
    return aviso(
      `${doc.label} se comparte por show`,
      "Este enlace es de la gira completa y este documento habla de una fecha concreta. Pide el enlace del show que te interesa.",
      404,
    );
  }

  const pdf = await generarDocDeGira(documento, gira!.id, secciones);
  if (!pdf) {
    return aviso(
      `${doc.label} todavía no se puede armar`,
      `A la gira "${gira!.nombre}" le falta información para este documento: el rider técnico todavía no está capturado.`,
      409,
    );
  }
  return respuestaPdf(pdf, true);
}
