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

  // Mejor calificación por usuario (promedio de la persona) y por evaluación (promedio del curso).
  const califPorUsuario = new Map<string, number[]>();
  const bestByEval = new Map<string, number[]>();
  for (const [k, v] of mejor) {
    const [uid, evalId] = k.split("::");
    const cu = califPorUsuario.get(uid) ?? []; cu.push(v.calificacion); califPorUsuario.set(uid, cu);
    const ce = bestByEval.get(evalId) ?? []; ce.push(v.calificacion); bestByEval.set(evalId, ce);
  }

  // Historial completo de intentos de evaluación por usuario (todos los intentos).
  const intentosFull = await prisma.intentoEvaluacion.findMany({
    orderBy: { creadoEn: "desc" },
    include: {
      usuario: { select: { name: true, area: true } },
      evaluacion: {
        select: {
          minAprobar: true,
          preguntas: true,
          sesion: { select: { titulo: true, numero: true, categoria: { select: { nombre: true, color: true } } } },
        },
      },
    },
  });
  type Pregunta = { pregunta: string; opciones: string[]; correcta: number };
  const historial = intentosFull.map((it) => {
    const preguntas = (Array.isArray(it.evaluacion.preguntas) ? it.evaluacion.preguntas : []) as unknown as Pregunta[];
    const respuestas = (Array.isArray(it.respuestas) ? it.respuestas : []) as unknown as number[];
    const detalle = preguntas.map((q, i) => {
      const elegidaIdx = respuestas[i];
      return {
        pregunta: q.pregunta,
        elegida: q.opciones?.[elegidaIdx] ?? "(sin responder)",
        correcta: q.opciones?.[q.correcta] ?? "",
        ok: elegidaIdx === q.correcta,
      };
    });
    return {
      usuario: it.usuario.name,
      area: it.usuario.area,
      sesionTitulo: it.evaluacion.sesion.titulo,
      categoria: it.evaluacion.sesion.categoria,
      calificacion: it.calificacion,
      aprobado: it.aprobado,
      minAprobar: it.evaluacion.minAprobar,
      creadoEn: it.creadoEn,
      aciertos: detalle.filter((d) => d.ok).length,
      total: detalle.length,
      detalle,
    };
  });

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
  const porUsuarioMap = new Map<string, { id: string; nombre: string; area: string | null; completadas: number; enProgreso: number; segundos: number; promedio: number | null; evaluaciones: number }>();
  for (const r of registros) {
    const key = r.usuario.id;
    const acc = porUsuarioMap.get(key) ?? { id: key, nombre: r.usuario.name, area: r.usuario.area, completadas: 0, enProgreso: 0, segundos: 0, promedio: null, evaluaciones: 0 };
    if (r.estado === "completado") acc.completadas++;
    else acc.enProgreso++;
    acc.segundos += r.segundos;
    porUsuarioMap.set(key, acc);
  }
  for (const [uid, acc] of porUsuarioMap) {
    const arr = califPorUsuario.get(uid);
    acc.promedio = arr && arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    acc.evaluaciones = arr?.length ?? 0;
  }
  const porUsuario = Array.from(porUsuarioMap.values()).sort((a, b) => b.completadas - a.completadas);

  // Análisis de ítems: qué preguntas se fallan más (por evaluación + índice de pregunta).
  const falloMap = new Map<string, { sesionTitulo: string; categoria: { nombre: string; color: string } | null; pregunta: string; fallos: number; total: number }>();
  for (const it of intentosFull) {
    const preguntas = (Array.isArray(it.evaluacion.preguntas) ? it.evaluacion.preguntas : []) as unknown as Pregunta[];
    const respuestas = (Array.isArray(it.respuestas) ? it.respuestas : []) as unknown as number[];
    preguntas.forEach((q, i) => {
      const key = `${it.evaluacionId}::${i}`;
      const agg = falloMap.get(key) ?? { sesionTitulo: it.evaluacion.sesion.titulo, categoria: it.evaluacion.sesion.categoria, pregunta: q.pregunta, fallos: 0, total: 0 };
      agg.total++;
      if (respuestas[i] !== q.correcta) agg.fallos++;
      falloMap.set(key, agg);
    });
  }
  const preguntasFalladas = Array.from(falloMap.values())
    .filter((f) => f.total > 0 && f.fallos > 0)
    .map((f) => ({ ...f, tasaFallo: Math.round((f.fallos / f.total) * 100) }))
    .sort((a, b) => b.tasaFallo - a.tasaFallo || b.fallos - a.fallos)
    .slice(0, 20);

  // Catálogo de cursos con agregados de gestión.
  const sesiones = await prisma.sesionCapacitacion.findMany({
    orderBy: { numero: "asc" },
    select: {
      id: true, titulo: true, numero: true, subArea: true, bloque: true, duracion: true,
      objetivos: true, puntosBase: true, puntosEditados: true,
      categoria: { select: { nombre: true, slug: true, color: true } },
      _count: { select: { versiones: true } },
      evaluacion: { select: { id: true } },
    },
  });
  const progresoPorSesion = new Map<string, { personas: Set<string>; completadas: number }>();
  for (const p of progresos) {
    const acc = progresoPorSesion.get(p.sesionId) ?? { personas: new Set<string>(), completadas: 0 };
    acc.personas.add(p.usuarioId);
    if (p.estado === "completado") acc.completadas++;
    progresoPorSesion.set(p.sesionId, acc);
  }
  const porCurso = sesiones.map((s) => {
    const prog = progresoPorSesion.get(s.id);
    const evalId = s.evaluacion?.id;
    const califs = evalId ? bestByEval.get(evalId) ?? [] : [];
    const promedio = califs.length ? Math.round(califs.reduce((a, b) => a + b, 0) / califs.length) : null;
    const tieneEsqueleto = s.objetivos.length + s.puntosBase.length + s.puntosEditados.length > 0;
    const tienePresentacion = s._count.versiones > 0;
    return {
      id: s.id, titulo: s.titulo, numero: s.numero,
      area: s.categoria?.nombre ?? null, areaColor: s.categoria?.color ?? "#6b7280",
      subArea: s.subArea?.trim() || s.bloque,
      duracion: s.duracion,
      tienePresentacion,
      tieneContenido: tienePresentacion || tieneEsqueleto,
      tieneEvaluacion: !!evalId,
      personas: prog?.personas.size ?? 0,
      completadas: prog?.completadas ?? 0,
      califPromedio: promedio,
      intentos: califs.length,
    };
  });

  // Agregado por área (para el panorama).
  const areaMap = new Map<string, { nombre: string; slug: string; color: string; cursos: number; conContenido: number; conEval: number; completadas: number }>();
  for (const c of porCurso) {
    const slug = sesiones.find((s) => s.id === c.id)?.categoria?.slug ?? "sin-area";
    const a = areaMap.get(slug) ?? { nombre: c.area ?? "Sin área", slug, color: c.areaColor, cursos: 0, conContenido: 0, conEval: 0, completadas: 0 };
    a.cursos++;
    if (c.tieneContenido) a.conContenido++;
    if (c.tieneEvaluacion) a.conEval++;
    a.completadas += c.completadas;
    areaMap.set(slug, a);
  }
  const porArea = Array.from(areaMap.values()).sort((a, b) => b.cursos - a.cursos);

  return NextResponse.json({ registros, porUsuario, historial, preguntasFalladas, porCurso, porArea });
}
