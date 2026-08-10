import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";
import { recurrenciaOcurreHoy, primeraOcurrencia, type RecurrenciaConfig } from "@/lib/recurrencia";

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
  colaboradores: { select: { usuario: { select: { id: true, name: true } } } },
  creadoPor:     { select: { id: true, name: true } },
  iniciativa:    { select: { id: true, nombre: true, color: true } },
  proyectoTarea: { select: { id: true, nombre: true, color: true } },
  proyectoEvento:{ select: { id: true, nombre: true, fechaEvento: true } },
  tratoId: true,
  trato:         { select: { id: true, nombreEvento: true, cliente: { select: { nombre: true } } } },
  clienteId: true,
  cliente:       { select: { id: true, nombre: true } },
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

  // "Mis tareas": responsable, sin-asignar creadas por mí, o co-responsable.
  const misTareasOR = [
    { asignadoAId: session.id },
    { asignadoAId: null, creadoPorId: session.id },
    { colaboradores: { some: { usuarioId: session.id } } },
  ];

  // Proyectos accesibles para no-admin
  let proyectosPermitidos: string[] | null = null;
  if (session.role !== "ADMIN") {
    const accesos = await prisma.proyectoAcceso.findMany({
      where: { userId: session.id },
      select: { proyectoId: true },
    });
    proyectosPermitidos = accesos.map((a: { proyectoId: string }) => a.proyectoId);
  }

  // Visibilidad de tareas de proyectos internos (de empresa):
  //  · EN_PAUSA (en hold) congela el proyecto → sus tareas se ocultan.
  //  · Proyecto privado → sólo admin o usuarios con acceso lo ven.
  // Las tareas sin proyecto interno (proyectoInternoId=null) no se ven afectadas.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proyectoInternoCond: Record<string, any> = {
    OR: [
      { proyectoInternoId: null },
      {
        proyectoInterno: {
          estado: { not: "EN_PAUSA" },
          ...(session.role === "ADMIN"
            ? {}
            : { OR: [{ esPrivado: false }, { accesos: { some: { userId: session.id } } }] }),
        },
      },
    ],
  };

  // Las tareas derivadas de una fuente (trato / proyecto de evento / proyecto
  // interno) solo entran a gestión operativa cuando ya tienen fecha Y responsable.
  // Sin agendar generan ruido; se gestionan en su vista de origen (Tratos /
  // Proyectos), no en las listas operativas (búsqueda, hoy, próximas, equipo, área).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const soloDerivadasAgendadas: Record<string, any> = {
    OR: [
      { tratoId: null, proyectoEventoId: null, proyectoInternoId: null },
      { AND: [{ fecha: { not: null } }, { asignadoAId: { not: null } }] },
    ],
  };

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
      estado:   { notIn: ["CANCELADA", "COMPLETADA"] },
      parentId: null,
      ptTemplateId: null,
      OR: [
        { titulo:      { contains: term, mode: "insensitive" } },
        { descripcion: { contains: term, mode: "insensitive" } },
        { notas:       { contains: term, mode: "insensitive" } },
      ],
    };
    // Acceso: no-admin sólo ve sus tareas personales + proyectos permitidos
    if (session.role !== "ADMIN") {
      const accessOr = [
        ...misTareasOR,
        ...(proyectosPermitidos && proyectosPermitidos.length > 0
          ? [{ proyectoTareaId: { in: proyectosPermitidos } }]
          : []),
      ];
      searchWhere.AND = [{ OR: searchWhere.OR }, { OR: accessOr }];
      delete searchWhere.OR;
    }
    searchWhere.AND = [...(searchWhere.AND ?? []), proyectoInternoCond, soloDerivadasAgendadas];
    const tareas = await prisma.tarea.findMany({
      where: searchWhere,
      select: SELECT,
      orderBy: [{ estado: "asc" }, { prioridad: "asc" }, { createdAt: "desc" }],
      take: 200,
    });
    return NextResponse.json({ tareas });
  }


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  // Exterminado del módulo de operaciones: las tareas generadas por el motor de
  // "plan de trabajo" (tipoOrigen=PLAN con ptTemplateId) ya no se muestran aquí.
  // Solo sobreviven los compromisos hechos a mano (ptTemplateId=null), incluidos
  // los recurrentes de las áreas.
  where.ptTemplateId = null;

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
    where.OR       = misTareasOR;
    if (proyectosPermitidos !== null) {
      where.AND = [
        { OR: where.OR },
        { OR: [
          { proyectoTareaId: null },
          { proyectoTareaId: { in: proyectosPermitidos } },
          // Una asignación directa (responsable o co-responsable) siempre gana:
          // la tarea se ve aunque su proyecto no esté entre los permitidos.
          { asignadoAId: session.id },
          { colaboradores: { some: { usuarioId: session.id } } },
        ] }
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
    where.OR     = misTareasOR;
    delete where.parentId;
    if (proyectosPermitidos !== null) {
      where.AND = [
        { OR: where.OR },
        { OR: [
          { proyectoTareaId: null },
          { proyectoTareaId: { in: proyectosPermitidos } },
          // Una asignación directa (responsable o co-responsable) siempre gana:
          // la tarea se ve aunque su proyecto no esté entre los permitidos.
          { asignadoAId: session.id },
          { colaboradores: { some: { usuarioId: session.id } } },
        ] }
      ];
      delete where.OR;
    }
  } else if (vista === "bandeja") {
    // Bandeja de entrada = tareas SUELTAS sin origen alguno. Se excluyen las
    // derivadas de tratos / proyectos-evento / proyectos-internos: esas no entran
    // a gestión operativa hasta que se les asigna una fecha (se ven en Hoy/Próximas).
    where.proyectoTareaId   = null;
    where.iniciativaId      = null;
    where.tratoId           = null;
    where.proyectoEventoId  = null;
    where.proyectoInternoId = null;
    where.parentId          = null;
    where.OR = misTareasOR;
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

  where.AND = [...(where.AND ?? []), proyectoInternoCond, soloDerivadasAgendadas];

  const tareas = await prisma.tarea.findMany({
    where,
    select: SELECT,
    orderBy: [{ fecha: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
  });

  // ── Vista HOY: incluir compromisos recurrentes sin fecha que ocurren hoy ──
  // Un compromiso recurrente se guarda con fecha=null; su patrón decide en qué días
  // aparece. En cambio, cuando se completa se genera la siguiente ocurrencia CON
  // fecha concreta (p.ej. el próximo miércoles): esa instancia ya la captura la query
  // por fecha en su día, así que aquí se EXCLUYE (fecha:null) para no mostrarla hoy.
  if (vista === "hoy") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recWhere: Record<string, any> = {
      recurrencia:  { not: null },
      fecha:        null,
      ptTemplateId: null,
      estado:       { notIn: ["COMPLETADA", "CANCELADA"] },
      parentId:     null,
      OR:           misTareasOR,
    };
    if (proyectosPermitidos !== null) {
      recWhere.AND = [
        { OR: recWhere.OR },
        { OR: [{ proyectoTareaId: null }, { proyectoTareaId: { in: proyectosPermitidos } }] },
      ];
      delete recWhere.OR;
    }
    recWhere.AND = [...(recWhere.AND ?? []), proyectoInternoCond];
    const recurrentes = await prisma.tarea.findMany({
      where: recWhere,
      select: SELECT,
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    });
    const ocurrenHoy = recurrentes.filter(t => recurrenciaOcurreHoy(t.recurrencia));
    // Merge deduplicado por id (una tarea recurrente podría tener fecha y ya venir en la 1ª query)
    const yaIncluidos = new Set(tareas.map(t => t.id));
    for (const t of ocurrenHoy) {
      if (!yaIncluidos.has(t.id)) { tareas.push(t); yaIncluidos.add(t.id); }
    }
  }

  return NextResponse.json({ tareas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  const body = await req.json();
  const {
    id: idCliente,
    titulo, descripcion, prioridad, area, asignadoAId, colaboradorIds, notas, etiquetas,
    iniciativaId, proyectoTareaId, seccionId, carpetaId,
    proyectoInternoId, faseInternaId, proyectoEventoId, tratoId, clienteId, esSeguimiento,
    parentId, fecha, fechaVencimiento, recurrencia, orden, juntaOrigenId,
    // Hub unificado: tipo de registro + comprobación
    tipoOrigen, tipoEvidencia, requiereEvidencia,
    porqueSeHace, estandarMinimo, siNoSeHace, cuando,
    // Acceso directo: módulo del sidebar (+ sección) o enlace externo
    moduloDestino, moduloTexto, moduloDisponible,
  } = body;

  if (!titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  // Idempotencia offline: si el cliente generó el id (tarea creada sin conexión)
  // y ya existe, devolvemos la existente en vez de duplicar al reenviar la cola.
  const idProvisto = typeof idCliente === "string" && idCliente ? idCliente : null;
  if (idProvisto) {
    const existente = await prisma.tarea.findUnique({ where: { id: idProvisto }, select: SELECT });
    if (existente) return NextResponse.json({ tarea: existente }, { status: 200 });
  }

  // Co-responsables: usuarios que ven/apoyan la tarea. Excluye al responsable primario.
  const colaboradoresLimpios: string[] = Array.isArray(colaboradorIds)
    ? [...new Set((colaboradorIds as unknown[]).filter((id): id is string => typeof id === "string" && !!id && id !== asignadoAId))]
    : [];

  // Deriva tipoOrigen automáticamente si no viene explícito, según el vínculo.
  const tipoResuelto: string =
    (typeof tipoOrigen === "string" && tipoOrigen) ||
    (tratoId ? "TRATO" : proyectoEventoId ? "EVENTO" : proyectoInternoId ? "PROYECTO" : clienteId ? "CLIENTE" : "TAREA");

  // La comprobación (NOTA | FOTO | ARCHIVO | ENLACE_MODULO) implica requiereEvidencia.
  const evidenciaTipo = typeof tipoEvidencia === "string" && tipoEvidencia ? tipoEvidencia : null;
  const requiere = requiereEvidencia === true || !!evidenciaTipo;

  // Recurrente sin fecha explícita: anclar a la primera ocurrencia >= hoy (incluye
  // hoy si el patrón cae hoy) para que muestre su próxima fecha, se ordene por
  // cercanía y aparezca en "Próximas".
  let fechaInicial: Date | null = fecha ? new Date(fecha) : null;
  if (!fechaInicial && recurrencia) {
    try {
      const cfg = JSON.parse(recurrencia) as RecurrenciaConfig;
      const hoyCST = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }));
      fechaInicial = primeraOcurrencia(cfg, hoyCST);
    } catch {
      // recurrencia inválida → sin fecha
    }
  }

  const tarea = await prisma.tarea.create({
    data: {
      ...(idProvisto ? { id: idProvisto } : {}),
      titulo:          titulo.trim(),
      descripcion:     descripcion      || null,
      prioridad:       prioridad        || "MEDIA",
      area:            area             || "GENERAL",
      // Una tarea con fecha siempre debe tener responsable: si no se indicó,
      // se asigna a quien la crea (así entra a las listas operativas).
      asignadoAId:     asignadoAId      || (fechaInicial ? session.id : null),
      creadoPorId:     session.id,
      iniciativaId:    iniciativaId     || null,
      proyectoTareaId: proyectoTareaId  || null,
      proyectoEventoId: proyectoEventoId || null,
      tratoId:         tratoId          || null,
      clienteId:       clienteId        || null,
      proyectoInternoId: proyectoInternoId || null,
      faseInternaId:   faseInternaId    || null,
      esSeguimiento:   esSeguimiento === true,
      seccionId:       seccionId        || null,
      carpetaId:       carpetaId        || null,
      parentId:        parentId         || null,
      fecha:           fechaInicial,
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
      moduloDestino:     moduloDestino  || null,
      moduloTexto:       moduloTexto    || null,
      moduloDisponible:  moduloDestino ? (moduloDisponible !== false) : true,
      colaboradores: colaboradoresLimpios.length > 0
        ? { create: colaboradoresLimpios.map((usuarioId) => ({ usuarioId })) }
        : undefined,
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

  // ── Notify co-responsables (excluye a quien la crea) ───────────────────
  const coDestinatarios = colaboradoresLimpios.filter((id) => id !== session.id);
  if (coDestinatarios.length > 0) {
    await prisma.notificacion.createMany({
      data: coDestinatarios.map((usuarioId) => ({
        usuarioId,
        tipo:    "TAREA",
        titulo:  tarea.titulo,
        mensaje: `${session.name} te sumó como co-responsable`,
        url:     `/operaciones?open=${tarea.id}`,
      })),
    });
  }

  return NextResponse.json({ tarea }, { status: 201 });
}
