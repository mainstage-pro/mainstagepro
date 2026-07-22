import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";

const AREA_TO_MODULE_KEY: Record<string, string> = {
  VENTAS: "tareas-ventas",
  PRODUCCION: "tareas-produccion",
  MARKETING: "tareas-marketing",
  ADMINISTRACION: "tareas-administracion",
  RRHH: "tareas-rrhh",
  DIRECCION: "tareas-direccion",
};

// Explicit SELECT. Las columnas nuevas (proyectoEventoId, evidenciaEnviada*)
// se aseguran vía ensureTareaColumns() antes de cada query.
const SELECT = {
  id: true,
  titulo: true,
  descripcion: true,
  prioridad: true,
  area: true,
  estado: true,
  fecha: true,
  fechaVencimiento: true,
  recurrencia: true,
  notas: true,
  etiquetas: true,
  orden: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  asignadoAId: true,
  creadoPorId: true,
  iniciativaId: true,
  proyectoTareaId: true,
  proyectoEventoId: true,
  proyectoInternoId: true,
  faseInternaId: true,
  seccionId: true,
  carpetaId: true,
  juntaOrigenId: true,
  fechaCompletada: true,
  // ── Bloque 3: acceso directo a módulo desde la lista ──
  moduloDestino: true,
  moduloTexto: true,
  moduloDisponible: true,
  // ── Bloque 4: estado de verificación (distintivo RECHAZADA) ──
  estadoVerificacion: true,
  motivoRechazo: true,
  // ── Bloque 5: tipoOrigen (tag) + indicadores de evidencia ──
  tipoOrigen: true,
  requiereEvidencia: true,
  tipoEvidencia: true,
  // ── Envío de evidencia (WhatsApp) previo a verificación ──
  evidenciaEnviadaAt: true,
  evidenciaEnviadaCanal: true,
  asignadoA:     { select: { id: true, name: true } },
  creadoPor:     { select: { id: true, name: true } },
  iniciativa:    { select: { id: true, nombre: true, color: true } },
  proyectoTarea: { select: { id: true, nombre: true, color: true } },
  proyectoEvento:{ select: { id: true, nombre: true, fechaEvento: true } },
  proyectoInterno:{ select: { id: true, nombre: true, area: true } },
  seccion:       { select: { id: true, nombre: true } },
  carpeta:       { select: { id: true, nombre: true } },
  juntaOrigen:   { select: { id: true, area: true, fecha: true } },
  _count:        { select: { subtareas: true, comentarios: true, archivos: true } },
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  // Proyectos accesibles para no-admin
  let proyectosPermitidos: string[] | null = null;
  if (session.role !== "ADMIN") {
    const accesos = await prisma.proyectoAcceso.findMany({
      where: { userId: session.id },
      select: { proyectoId: true },
    });
    proyectosPermitidos = accesos.map((a: { proyectoId: string }) => a.proyectoId);
  }

  const { searchParams } = new URL(req.url);
  const vista             = searchParams.get("vista");
  const proyectoId        = searchParams.get("proyectoId");
  const area              = searchParams.get("area");
  const estado            = searchParams.get("estado");
  const asignadoAId       = searchParams.get("asignadoAId");
  const iniciativaId      = searchParams.get("iniciativaId");
  const parentId          = searchParams.get("parentId");
  const q                 = searchParams.get("q");

  // ── Búsqueda global — ignora filtros de vista ──────────────────────────────
  if (q?.trim()) {
    const term = q.trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchWhere: Record<string, any> = {
      estado:   { not: "CANCELADA" },
      parentId: null,
      OR: [
        { titulo:      { contains: term, mode: "insensitive" } },
        { descripcion: { contains: term, mode: "insensitive" } },
        { notas:       { contains: term, mode: "insensitive" } },
      ],
    };
    // Acceso: no-admin sólo ve sus tareas personales + proyectos permitidos
    if (session.role !== "ADMIN") {
      const accessOr = [
        { asignadoAId: session.id },
        { asignadoAId: null, creadoPorId: session.id },
        ...(proyectosPermitidos && proyectosPermitidos.length > 0
          ? [{ proyectoTareaId: { in: proyectosPermitidos } }]
          : []),
      ];
      searchWhere.AND = [{ OR: searchWhere.OR }, { OR: accessOr }];
      delete searchWhere.OR;
    }
    const tareas = await prisma.tarea.findMany({
      where: searchWhere,
      select: SELECT,
      orderBy: [{ estado: "asc" }, { prioridad: "asc" }, { createdAt: "desc" }],
      take: 50,
    });
    return NextResponse.json({ tareas });
  }


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  // Módulo unificado: se gestionan los 4 sistemas (TAREA | PLAN | PROYECTO | EVENTO).
  // Filtro opcional por tipoOrigen vía ?tipoOrigen=PLAN,EVENTO
  const tipoOrigenParam = searchParams.get("tipoOrigen");
  if (tipoOrigenParam) {
    const tipos = tipoOrigenParam.split(",").map(s => s.trim()).filter(Boolean);
    if (tipos.length > 0) where.tipoOrigen = { in: tipos };
  }

  if (area)         where.area            = area;
  if (asignadoAId)  where.asignadoAId     = asignadoAId;
  if (iniciativaId) where.iniciativaId    = iniciativaId;
  if (proyectoId)   where.proyectoTareaId = proyectoId;

  // parentId: null string = top-level only, actual id = subtareas of that task
  if (parentId === "null") where.parentId = null;
  else if (parentId)       where.parentId = parentId;
  else                     where.parentId = null; // default: top-level

  if (estado) {
    where.estado = estado;
  } else {
    where.estado = { not: "CANCELADA" };
  }

  if (vista === "hoy") {
    // End of today in CST: get tomorrow's date in CST, use midnight UTC as exclusive upper bound
    const hoyCST = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    const mananaCST = new Date(hoyCST);
    mananaCST.setUTCDate(mananaCST.getUTCDate() + 1);
    where.fecha    = { lt: mananaCST };
    where.estado   = { notIn: ["COMPLETADA", "CANCELADA"] };
    where.parentId = null;
    where.OR       = [{ asignadoAId: session.id }, { asignadoAId: null, creadoPorId: session.id }];
    if (proyectosPermitidos !== null) {
      where.AND = [
        { OR: where.OR },
        { OR: [{ proyectoTareaId: null }, { proyectoTareaId: { in: proyectosPermitidos } }] }
      ];
      delete where.OR;
    }
  } else if (vista === "proximas") {
    const hoyCST = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    const manana = new Date(hoyCST);
    manana.setUTCDate(manana.getUTCDate() + 1);
    const en30 = new Date(manana);
    en30.setUTCDate(manana.getUTCDate() + 30);
    where.fecha  = { gte: manana, lte: en30 };
    where.estado = { not: "COMPLETADA" };
    where.OR     = [{ asignadoAId: session.id }, { asignadoAId: null, creadoPorId: session.id }];
    delete where.parentId;
    if (proyectosPermitidos !== null) {
      where.AND = [
        { OR: where.OR },
        { OR: [{ proyectoTareaId: null }, { proyectoTareaId: { in: proyectosPermitidos } }] }
      ];
      delete where.OR;
    }
  } else if (vista === "bandeja") {
    where.proyectoTareaId = null;
    where.iniciativaId    = null;
    where.parentId        = null;
    where.OR = [{ asignadoAId: session.id }, { asignadoAId: null, creadoPorId: session.id }];
  } else if (vista === "equipo") {
    if (session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    // Todas las tareas top-level: de proyectos, áreas, iniciativas, asignadas o sin asignar.
    where.parentId = null;
  } else if (vista === "area") {
    if (!area) return NextResponse.json({ error: "Área requerida" }, { status: 400 });
    if (session.role !== "ADMIN") {
      const moduleKey = AREA_TO_MODULE_KEY[area];
      if (moduleKey) {
        const acceso = await prisma.moduloAcceso.findFirst({ where: { userId: session.id, moduloKey: moduleKey } });
        if (!acceso) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      } else {
        return NextResponse.json({ error: "Área no válida" }, { status: 400 });
      }
    }
    where.area            = area;
    where.proyectoTareaId = null;
    where.iniciativaId    = null;
    where.parentId        = null;
    where.estado          = { notIn: ["COMPLETADA", "CANCELADA"] };
  } else if (vista === "abandonadas") {
    where.estado    = { notIn: ["COMPLETADA", "CANCELADA"] };
    where.parentId  = null;
    where.createdAt = { lte: new Date(Date.now() - 15 * 86400000) };
  }

  const tareas = await prisma.tarea.findMany({
    where,
    select: SELECT,
    orderBy: [{ fecha: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ tareas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  const body = await req.json();
  const {
    titulo, descripcion, prioridad, area, asignadoAId, notas, etiquetas,
    iniciativaId, proyectoTareaId, seccionId, carpetaId,
    proyectoInternoId, faseInternaId, proyectoEventoId,
    parentId, fecha, fechaVencimiento, recurrencia, orden, juntaOrigenId,
    // Hub unificado: tipo de registro + comprobación
    tipoOrigen, tipoEvidencia, requiereEvidencia,
    porqueSeHace, estandarMinimo, siNoSeHace, cuando,
  } = body;

  if (!titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  // Deriva tipoOrigen automáticamente si no viene explícito, según el vínculo.
  const tipoResuelto: string =
    (typeof tipoOrigen === "string" && tipoOrigen) ||
    (proyectoEventoId ? "EVENTO" : proyectoInternoId ? "PROYECTO" : "TAREA");

  // La comprobación (NOTA | FOTO | ARCHIVO | ENLACE_MODULO) implica requiereEvidencia.
  const evidenciaTipo = typeof tipoEvidencia === "string" && tipoEvidencia ? tipoEvidencia : null;
  const requiere = requiereEvidencia === true || !!evidenciaTipo;

  const tarea = await prisma.tarea.create({
    data: {
      titulo:          titulo.trim(),
      descripcion:     descripcion      || null,
      prioridad:       prioridad        || "MEDIA",
      area:            area             || "GENERAL",
      asignadoAId:     asignadoAId      || null,
      creadoPorId:     session.id,
      iniciativaId:    iniciativaId     || null,
      proyectoTareaId: proyectoTareaId  || null,
      proyectoEventoId: proyectoEventoId || null,
      proyectoInternoId: proyectoInternoId || null,
      faseInternaId:   faseInternaId    || null,
      seccionId:       seccionId        || null,
      carpetaId:       carpetaId        || null,
      parentId:        parentId         || null,
      fecha:           fecha            ? new Date(fecha) : null,
      fechaVencimiento:fechaVencimiento ? new Date(fechaVencimiento) : null,
      recurrencia:     recurrencia      || null,
      notas:           notas            || null,
      etiquetas:       etiquetas        ? (typeof etiquetas === "string" ? etiquetas : JSON.stringify(etiquetas)) : null,
      orden:           orden            ?? 0,
      juntaOrigenId:   juntaOrigenId    || null,
      // Hub unificado (la verificación arranca al completar, no al crear)
      tipoOrigen:        tipoResuelto,
      requiereEvidencia: requiere,
      tipoEvidencia:     evidenciaTipo,
      porqueSeHace:      porqueSeHace   || null,
      estandarMinimo:    estandarMinimo || null,
      siNoSeHace:        siNoSeHace     || null,
      cuando:            cuando         || null,
    },
    select: SELECT,
  });

  // ── Notify assignee when task is created with an assignee ───────────────
  if (asignadoAId && asignadoAId !== session.id) {
    await prisma.notificacion.create({
      data: {
        usuarioId: asignadoAId,
        tipo:      "TAREA",
        titulo:    tarea.titulo,
        mensaje:   `${session.name} te asignó esta tarea`,
        url:       `/operaciones?open=${tarea.id}`,
      },
    });
  }

  return NextResponse.json({ tarea }, { status: 201 });
}
