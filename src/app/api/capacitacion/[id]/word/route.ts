import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/capacitacion/[id]/word — Documento Word (.doc) del módulo.
// Se genera como HTML compatible con Word (application/msword), sin dependencias
// extra. Incluye el desarrollo del tema y, si existe, el examen al final.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const sesion = await prisma.sesionCapacitacion.findUnique({
    where: { id },
    include: {
      categoria: { select: { nombre: true } },
      evaluacion: { select: { preguntas: true, minAprobar: true } },
    },
  });
  if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  const puntos = sesion.puntosEditados.length ? sesion.puntosEditados : sesion.puntosBase;
  const area = sesion.categoria?.nombre ?? "General";
  const num = String(sesion.numero).padStart(2, "0");

  const esc = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");

  type Pregunta = { pregunta: string; opciones: string[]; correcta: number };
  const preguntas: Pregunta[] = sesion.evaluacion
    ? ((sesion.evaluacion.preguntas as unknown as Pregunta[]) || []).filter(
        (p) => p && typeof p.pregunta === "string" && Array.isArray(p.opciones),
      )
    : [];
  const letra = (i: number) => String.fromCharCode(65 + i);

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Sesión ${num} — ${esc(sesion.titulo)}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.5; }
  h1 { color: #000; font-size: 20pt; margin-bottom: 2pt; }
  .brand { color: #B3985B; font-size: 10pt; letter-spacing: 2px; font-weight: bold; }
  .meta { color: #777; font-size: 9pt; margin-bottom: 16pt; }
  h2 { color: #B3985B; font-size: 12pt; border-bottom: 1px solid #ddd; padding-bottom: 3pt; margin-top: 18pt; }
  ol, ul { margin-top: 4pt; }
  li { margin-bottom: 4pt; }
  .nota { background: #F7F5F0; border-left: 3px solid #B3985B; padding: 10pt; }
  .q { margin-bottom: 10pt; }
  .q b { display: block; }
  .opt { margin-left: 16pt; }
</style>
</head>
<body>
  <div class="brand">MAINSTAGE PRO</div>
  <h1>${num}. ${esc(sesion.titulo)}</h1>
  <div class="meta">${esc(area)} &middot; ${sesion.duracion} min &middot; Impartidor: ${esc(sesion.impartidor)}</div>

  ${sesion.descripcion ? `<h2>Descripción</h2><p>${esc(sesion.descripcion)}</p>` : ""}

  ${
    sesion.objetivos.length
      ? `<h2>Objetivos de aprendizaje</h2><ul>${sesion.objetivos.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>`
      : ""
  }

  ${
    puntos.length
      ? `<h2>Desarrollo del tema</h2><ol>${puntos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>`
      : ""
  }

  ${sesion.notas?.trim() ? `<h2>Notas del instructor</h2><div class="nota">${esc(sesion.notas)}</div>` : ""}

  ${
    preguntas.length
      ? `<h2>Evaluación (mínimo para aprobar ${sesion.evaluacion?.minAprobar ?? 80}%)</h2>` +
        preguntas
          .map(
            (q, i) =>
              `<div class="q"><b>${i + 1}. ${esc(q.pregunta)}</b>${q.opciones
                .map((o, j) => `<div class="opt">${letra(j)}) ${esc(o)}</div>`)
                .join("")}</div>`,
          )
          .join("") +
        `<h2>Hoja de respuestas</h2><p>${preguntas.map((q, i) => `${i + 1}. ${letra(q.correcta)}`).join("&nbsp;&nbsp;&middot;&nbsp;&nbsp;")}</p>`
      : ""
  }
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "application/msword",
      "Content-Disposition": `attachment; filename="sesion-${num}-modulo.doc"`,
    },
  });
}
