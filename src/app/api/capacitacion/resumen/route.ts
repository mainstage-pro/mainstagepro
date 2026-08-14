import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeEditarCapacitacion } from "@/lib/capacitacion";

// GET /api/capacitacion/resumen — Resumen para dirección: quién tomó qué,
// cuánto tardó y su calificación.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEditarCapacitacion(session)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const progresos = await prisma.progresoCapacitacion.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      usuario: { select: { id: true, name: true, email: true, area: true } },
      sesion: {
        select: {
          id: true,
          titulo: true,
          numero: true,
          categoria: { select: { nombre: true, slug: true, color: true } },
          evaluacion: { select: { id: true } },
        },
      },
    },
  });

  // Mejor calificación por usuario+evaluación
  const intentos = await prisma.intentoEvaluacion.findMany({
    orderBy: { calificacion: "desc" },
    select: { usuarioId: true, evaluacionId: true, calificacion: true, aprobado: true },
  });
  const mejor = new Map<string, { calificacion: number; aprobado: boolean }>();
  for (const it of intentos) {
    const k = `${it.usuarioId}::${it.evaluacionId}`;
    if (!mejor.has(k)) mejor.set(k, { calificacion: it.calificacion, aprobado: it.aprobado });
  }

  // Historial completo de intentos de evaluación por usuario (todos los intentos).
  const intentosFull = await prisma.intentoEvaluacion.findMany({
    orderBy: { creadoEn: "desc" },
    include: {
      usuario: { select: { name: true, area: true } },
      evaluacion: {
        select: {
          minAprobar: true,
          sesion: { select: { titulo: true, numero: true, categoria: { select: { nombre: true, color: true } } } },
        },
      },
    },
  });
  const historial = intentosFull.map((it) => ({
    usuario: it.usuario.name,
    area: it.usuario.area,
    sesionTitulo: it.evaluacion.sesion.titulo,
    categoria: it.evaluacion.sesion.categoria,
    calificacion: it.calificacion,
    aprobado: it.aprobado,
    minAprobar: it.evaluacion.minAprobar,
    creadoEn: it.creadoEn,
  }));

  const registros = progresos.map((p) => {
    const evalId = p.sesion.evaluacion?.id;
    const m = evalId ? mejor.get(`${p.usuarioId}::${evalId}`) : undefined;
    return {
      usuario: p.usuario,
      sesionTitulo: p.sesion.titulo,
      sesionNumero: p.sesion.numero,
      categoria: p.sesion.categoria,
      estado: p.estado,
      segundos: p.segundos,
      iniciadoEn: p.iniciadoEn,
      completadoEn: p.completadoEn,
      calificacion: m?.calificacion ?? null,
      aprobado: m?.aprobado ?? null,
    };
  });

  // Agregado por usuario
  const porUsuarioMap = new Map<string, { nombre: string; area: string | null; completadas: number; enProgreso: number; segundos: number }>();
  for (const r of registros) {
    const key = r.usuario.id;
    const acc = porUsuarioMap.get(key) ?? { nombre: r.usuario.name, area: r.usuario.area, completadas: 0, enProgreso: 0, segundos: 0 };
    if (r.estado === "completado") acc.completadas++;
    else acc.enProgreso++;
    acc.segundos += r.segundos;
    porUsuarioMap.set(key, acc);
  }
  const porUsuario = Array.from(porUsuarioMap.values()).sort((a, b) => b.completadas - a.completadas);

  return NextResponse.json({ registros, porUsuario, historial });
}
