import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pregPublica, parseJSON, type MostrarSi } from "@/lib/formularios";
import crypto from "crypto";

export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const f = await prisma.formulario.findUnique({
    where: { slug },
    include: {
      secciones: {
        where: { archivada: false },
        orderBy: { orden: "asc" },
        include: { preguntas: { where: { archivada: false }, orderBy: { orden: "asc" } } },
      },
    },
  });

  if (!f || f.estado !== "PUBLICADO" || !f.aceptaRespuestas) {
    return NextResponse.json({
      error: "cerrado",
      titulo: f?.titulo ?? null,
      mensaje: "Esta convocatoria no está recibiendo postulaciones.",
    }, { status: 404 });
  }

  return NextResponse.json({
    formulario: {
      id: f.id,
      slug: f.slug,
      titulo: f.titulo,
      descripcion: f.descripcion,
      imagenUrl: f.imagenUrl,
      mensajeConfirmacion: f.mensajeConfirmacion,
      secciones: f.secciones.map((s) => ({
        id: s.id,
        orden: s.orden,
        titulo: s.titulo,
        descripcion: s.descripcion,
        mostrarSi: parseJSON<MostrarSi>(s.mostrarSi, null),
        preguntas: s.preguntas.map(pregPublica),
      })),
    },
  });
}

// Rate-limit en memoria sencillo (por IP): 5 envíos por 10 minutos.
// Nota (Fase 1): no persiste entre instancias serverless; suficiente para
// disuadir envíos repetidos obvios. En Fase 2/3 valdría la pena mover a Redis
// o a una tabla de rate-limit.
const ENVIOS_RECIENTES = new Map<string, number[]>();
function dejaPasar(ip: string): boolean {
  const ahora = Date.now();
  const ventana = 10 * 60 * 1000;
  const previos = (ENVIOS_RECIENTES.get(ip) ?? []).filter((t) => ahora - t < ventana);
  if (previos.length >= 5) {
    ENVIOS_RECIENTES.set(ip, previos);
    return false;
  }
  previos.push(ahora);
  ENVIOS_RECIENTES.set(ip, previos);
  return true;
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("x-real-ip")
    || "0.0.0.0";

  if (!dejaPasar(ip)) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));

  // Honeypot: campo oculto que nunca debería llegar lleno.
  if (body.__botbait) {
    return NextResponse.json({ ok: true, honeypot: true });
  }

  const f = await prisma.formulario.findUnique({
    where: { slug },
    include: {
      secciones: {
        where: { archivada: false },
        include: { preguntas: { where: { archivada: false } } },
      },
    },
  });
  if (!f || f.estado !== "PUBLICADO" || !f.aceptaRespuestas) {
    return NextResponse.json({ error: "El formulario no está recibiendo respuestas." }, { status: 404 });
  }

  const respuestasEntrada: Record<string, unknown> = body.respuestas && typeof body.respuestas === "object" ? body.respuestas : {};
  const preguntasPorId = new Map(f.secciones.flatMap((s) => s.preguntas.map((p) => [p.id, { seccion: s, pregunta: p }])));

  // Validación server-side de obligatorias (considerando mostrarSi).
  const { seMuestra } = await import("@/lib/formularios");
  const seccionesVisibles = new Set<string>();
  for (const s of f.secciones) {
    const cond = parseJSON<MostrarSi>(s.mostrarSi, null);
    if (seMuestra(cond, respuestasEntrada)) seccionesVisibles.add(s.id);
  }

  for (const s of f.secciones) {
    if (!seccionesVisibles.has(s.id)) continue;
    for (const p of s.preguntas) {
      const cond = parseJSON<MostrarSi>(p.mostrarSi, null);
      if (!seMuestra(cond, respuestasEntrada)) continue;
      if (!p.obligatoria) continue;
      const v = respuestasEntrada[p.id];
      const vacio = v == null || v === "" || (Array.isArray(v) && v.length === 0);
      if (vacio) {
        return NextResponse.json(
          { error: `Falta responder: ${p.texto}`, preguntaId: p.id },
          { status: 400 }
        );
      }
    }
  }

  // Crear respuesta + snapshots.
  const respuesta = await prisma.formularioRespuesta.create({
    data: {
      formularioId: f.id,
      ipHash: hashIp(ip),
      respuestasPreguntas: {
        create: Array.from(preguntasPorId.entries())
          .filter(([pid]) => {
            const { seccion, pregunta } = preguntasPorId.get(pid)!;
            if (!seccionesVisibles.has(seccion.id)) return false;
            const cond = parseJSON<MostrarSi>(pregunta.mostrarSi, null);
            if (!seMuestra(cond, respuestasEntrada)) return false;
            return pid in respuestasEntrada;
          })
          .map(([pid, { pregunta }]) => ({
            preguntaId: pid,
            valor: JSON.stringify(respuestasEntrada[pid] ?? null),
            snapshotPregunta: JSON.stringify({
              codigo: pregunta.codigo,
              texto: pregunta.texto,
              tipo: pregunta.tipo,
              opciones: parseJSON<string[]>(pregunta.opciones, []),
              valoracion: parseJSON<unknown>(pregunta.valoracion, null),
            }),
          })),
      },
    },
  });

  return NextResponse.json({
    ok: true,
    id: respuesta.id,
    mensaje: f.mensajeConfirmacion ?? "Gracias, recibimos tu postulación.",
  });
}
