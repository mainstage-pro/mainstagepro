import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";
import { calcularProximaFecha, primeraOcurrencia, type RecurrenciaConfig } from "@/lib/recurrencia";
import { avanzarPorHito } from "@/lib/proceso/tareas-subetapa";

function parseEtiquetas(etiquetas: string | null): string[] {
  if (!etiquetas) return [];
  try {
    const arr = JSON.parse(etiquetas) as unknown;
    return Array.isArray(arr) ? arr.filter((e): e is string => typeof e === "string") : [];
  } catch {
    return [];
  }
}

// Explicit SELECT — avoids selecting proyectoEventoId which may not exist in DB yet
const SELECT = {
  id: true,
  titulo: true,
  descripcion: true,
  prioridad: true,
  area: true,
  estado: true,
  fecha: true,
  fechaVencimiento: true,
  fechaCompletada: true,
  recurrencia: true,
  notas: true,
  etiquetas: true,
  orden: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  asignadoAId: true,
  creadoPorId: true,
  // ── Capa aditiva (Bloque 3): evidencia, verificación y ficha del estándar ──
  tipoOrigen: true,
  requiereEvidencia: true,
  tipoEvidencia: true,
  evidenciaNota: true,
  estadoVerificacion: true,
  motivoRechazo: true,
  evidenciaEnviadaAt: true,
  evidenciaEnviadaCanal: true,
  noRealizada: true,
  motivoNoRealizada: true,
  justificacionNoRealizada: true,
  evidenciasHistorial: true,
  porqueSeHace: true,
  estandarMinimo: true,
  siNoSeHace: true,
  cuando: true,
  moduloDestino: true,
  moduloTexto: true,
  moduloDisponible: true,
  esAccionCampo: true,
  ptTemplateId: true,
  tratoId: true,
  iniciativaId: true,
  proyectoTareaId: true,
  seccionId: true,
  carpetaId: true,
  asignadoA:     { select: { id: true, name: true } },
  colaboradores: { select: { usuario: { select: { id: true, name: true } } } },
  creadoPor:     { select: { id: true, name: true } },
  iniciativa:    { select: { id: true, nombre: true, color: true } },
  proyectoTarea: { select: { id: true, nombre: true, color: true } },
  seccion:       { select: { id: true, nombre: true } },
  carpeta:       { select: { id: true, nombre: true } },
  _count:        { select: { subtareas: true, comentarios: true, archivos: true } },
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  const { id } = await params;
  const tarea = await prisma.tarea.findUnique({
    where: { id },
    select: {
      ...SELECT,
      subtareas: {
        where: { estado: { not: "CANCELADA" } },
        select: {
          id: true, titulo: true, estado: true, prioridad: true,
          fecha: true, fechaVencimiento: true,
          asignadoA: { select: { id: true, name: true } },
          _count: { select: { subtareas: true } },
        },
        orderBy: { orden: "asc" },
      },
      comentarios: {
        select: {
          id: true, contenido: true, createdAt: true,
          autor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      archivos: {
        select: {
          id: true, nombre: true, url: true, tipo: true, tamano: true, createdAt: true,
          subidoPor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tarea) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ tarea });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  const { id } = await params;
  const body   = await req.json();

  const allowed = [
    "titulo", "descripcion", "prioridad", "area", "estado", "enBandeja",
    "asignadoAId", "iniciativaId", "proyectoTareaId", "seccionId", "carpetaId", "parentId",
    "fecha", "fechaVencimiento", "recurrencia", "notas", "etiquetas", "orden",
    // Campos de ficha (editables para tareas creadas a mano) + evidencia
    "porqueSeHace", "estandarMinimo", "siNoSeHace", "cuando", "evidenciaNota",
    "requiereEvidencia", "tipoEvidencia",
    // Acceso directo a módulo / enlace externo (editable en el hub)
    "moduloDestino", "moduloTexto", "moduloDisponible",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (!(key in body)) continue;
    if (key === "fecha" || key === "fechaVencimiento") {
      data[key] = body[key] ? new Date(body[key]) : null;
    } else {
      data[key] = body[key];
    }
  }

  // ── Reclasificar el sistema operativo de la tarea (tipoOrigen) ────────────────
  // Permite convertir cualquier tarea entre sistemas (ej. una tarea normal en una
  // tarea de plan de trabajo). Operaciones agrupa por el vínculo real (FK), así que
  // al pasar a TAREA/PLAN desligamos la entidad de origen para que la clasificación
  // sea coherente y la tarea aterrice en Bandeja / Plan.
  if ("tipoOrigen" in body) {
    const TIPOS_VALIDOS = ["TAREA", "PLAN", "PROYECTO", "EVENTO", "TRATO"];
    const nuevoTipo = typeof body.tipoOrigen === "string" ? body.tipoOrigen : null;
    if (!nuevoTipo || !TIPOS_VALIDOS.includes(nuevoTipo)) {
      return NextResponse.json({ error: "Tipo de tarea inválido." }, { status: 400 });
    }
    // Las tareas generadas por una plantilla de plan de trabajo las administra el
    // motor del plan; no se reclasifican a mano.
    const meta = await prisma.tarea.findUnique({ where: { id }, select: { ptTemplateId: true } });
    if (meta?.ptTemplateId) {
      return NextResponse.json(
        { error: "Esta tarea la administra el plan de trabajo y no puede cambiar de tipo.", code: "TIPO_BLOQUEADO" },
        { status: 422 },
      );
    }
    data.tipoOrigen = nuevoTipo;
    data.origenPlan = nuevoTipo === "PLAN";
    if (nuevoTipo === "TAREA" || nuevoTipo === "PLAN") {
      data.tratoId = null;
      data.proyectoEventoId = null;
      data.proyectoInternoId = null;
      data.faseInternaId = null;
    }
  }

  // Reagendado de recurrentes: al completar, la MISMA tarea avanza a la próxima fecha
  // (no se genera una tarea nueva). Se calcula aquí y se aplica al `data` antes del update.
  let reagendar: {
    proximaFecha: Date;
    fechaAnterior: Date | null;
    // Snapshot de la evidencia de la ocurrencia que se acaba de completar; se
    // archiva en `evidenciasHistorial` y se limpia la tarea para la siguiente.
    historialJSON?: string;
    archivosAEliminar?: string[];
  } | null = null;

  // ── "No fue necesario" ────────────────────────────────────────────────────
  // Marca la tarea como hecha pero señalada como no-necesaria (etiqueta
  // `no-necesario`). No exige evidencia y no dispara avance de subetapa: los hitos
  // solo avanzan al completarse de verdad. Al reabrir una tarea se quita la marca.
  const marcarNoNecesario = body.noNecesario === true;
  const reabrir = "estado" in data && data.estado !== "COMPLETADA";
  if (marcarNoNecesario) data.estado = "COMPLETADA";
  if (marcarNoNecesario || reabrir) {
    const etiqActual = "etiquetas" in data
      ? data.etiquetas
      : (await prisma.tarea.findUnique({ where: { id }, select: { etiquetas: true } }))?.etiquetas ?? null;
    const tags = parseEtiquetas(etiqActual).filter((t) => t !== "no-necesario");
    if (marcarNoNecesario) tags.push("no-necesario");
    data.etiquetas = JSON.stringify(tags);
  }

  // ── "No realizada" ─────────────────────────────────────────────────────────
  // La tarea no se hizo, con un motivo justificado (no fue necesaria · no supe
  // cómo · no fue clara · otro). Se cierra (sale de la lista activa) pero con la
  // bandera `noRealizada` + motivo, y pasa a verificación para que un revisor la
  // valide. Al reabrir la tarea se limpia la marca.
  const marcarNoRealizada = body.noRealizada === true;
  if (marcarNoRealizada) {
    const MOTIVOS = ["NO_NECESARIA", "NO_SUPE", "NO_CLARA", "OTRO"];
    const motivo = typeof body.motivoNoRealizada === "string" ? body.motivoNoRealizada : null;
    const justif = typeof body.justificacionNoRealizada === "string" ? body.justificacionNoRealizada.trim() : "";
    if (!motivo || !MOTIVOS.includes(motivo)) {
      return NextResponse.json({ error: "Selecciona un motivo válido.", code: "MOTIVO_INVALIDO" }, { status: 422 });
    }
    if (justif.length < 5) {
      return NextResponse.json({ error: "Escribe una justificación (mínimo 5 caracteres).", code: "JUSTIFICACION_REQUERIDA" }, { status: 422 });
    }
    data.estado = "COMPLETADA";
    data.noRealizada = true;
    data.motivoNoRealizada = motivo;
    data.justificacionNoRealizada = justif;
    data.estadoVerificacion = "PENDIENTE_VERIFICACION";
  } else if (reabrir) {
    // Reabrir limpia cualquier marca previa de "no realizada".
    data.noRealizada = false;
    data.motivoNoRealizada = null;
    data.justificacionNoRealizada = null;
  }

  // ── Gate de evidencia (server-side): al completar, validar según tipoEvidencia ──
  if ("estado" in data && data.estado === "COMPLETADA" && !marcarNoNecesario && !marcarNoRealizada) {
    const actual = await prisma.tarea.findUnique({
      where: { id },
      select: {
        requiereEvidencia: true,
        tipoEvidencia: true,
        evidenciaNota: true,
        evidenciasHistorial: true,
        recurrencia: true,
        fecha: true,
        asignadoAId: true,
        creadoPorId: true,
        archivos: { select: { id: true, nombre: true, url: true, tipo: true } },
      },
    });
    if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Solo el responsable primario da el check y entrega la evidencia. Los
    // co-responsables ven/apoyan la tarea pero no la cierran. Admin y (si está
    // sin asignar) el creador pueden hacerlo.
    const puedeCerrar =
      session.role === "ADMIN" ||
      actual.asignadoAId === session.id ||
      (actual.asignadoAId === null && actual.creadoPorId === session.id);
    if (!puedeCerrar) {
      return NextResponse.json(
        { error: "Solo el responsable puede completar esta tarea.", code: "SOLO_RESPONSABLE" },
        { status: 403 }
      );
    }

    if (actual.requiereEvidencia) {
      // Nota efectiva: la que llega en el body (si viene) o la persistida
      const notaEfectiva = ("evidenciaNota" in data ? data.evidenciaNota : actual.evidenciaNota) as string | null;
      const archivos = actual.archivos;
      const tieneImagen = archivos.some((a) => (a.tipo ?? "").toLowerCase().startsWith("image/"));
      const tieneArchivo = archivos.length > 0;
      const notaValida = !!notaEfectiva && notaEfectiva.trim().length >= 10;

      let falta: string | null = null;
      switch (actual.tipoEvidencia) {
        case "FOTO":
          if (!tieneImagen) falta = "Adjunta al menos una foto (imagen) para completar esta tarea.";
          break;
        case "ARCHIVO":
          if (!tieneArchivo) falta = "Adjunta al menos un archivo para completar esta tarea.";
          break;
        case "NOTA":
          if (!notaValida) falta = "Escribe una nota de evidencia (mínimo 10 caracteres) para completar esta tarea.";
          break;
        case "ENLACE_MODULO":
          if (!notaValida && !tieneArchivo) falta = "Confirma con una nota (mínimo 10 caracteres) o adjunta un archivo para completar esta tarea.";
          break;
        default:
          // tipoEvidencia null pero requiereEvidencia true → exigir al menos nota o archivo
          if (!notaValida && !tieneArchivo) falta = "Agrega evidencia (nota o archivo) para completar esta tarea.";
      }

      if (falta) {
        return NextResponse.json({ error: falta, code: "EVIDENCIA_REQUERIDA", tipoEvidencia: actual.tipoEvidencia }, { status: 422 });
      }
    }

    // estadoVerificacion según si requiere evidencia
    data.estadoVerificacion = actual.requiereEvidencia ? "PENDIENTE_VERIFICACION" : "NO_REQUIERE";

    // Si es recurrente: en vez de completarla, la reagendamos a la próxima fecha.
    if (actual.recurrencia) {
      try {
        const cfg = JSON.parse(actual.recurrencia) as RecurrenciaConfig;
        const desde = actual.fecha ?? new Date();
        // La próxima ocurrencia debe caer estrictamente en el futuro para que la
        // tarea salga de "Hoy" (comportamiento estilo Todoist). Si estaba vencida y
        // el patrón arroja una fecha pasada o de hoy, avanzamos hasta la primera
        // ocurrencia futura (mismo límite CST que usa la vista "hoy").
        const hoyCST = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }));
        const mananaCST = new Date(hoyCST);
        mananaCST.setUTCDate(mananaCST.getUTCDate() + 1);
        let prox = calcularProximaFecha(cfg, desde);
        for (let i = 0; i < 500 && prox < mananaCST; i++) {
          const next = calcularProximaFecha(cfg, prox);
          if (next <= prox) break; // sin avance: evita bucle infinito
          prox = next;
        }
        // Snapshot de la evidencia de esta ocurrencia antes de limpiarla, para
        // que quede en el historial y la próxima semana arranque en blanco.
        const notaSnapshot = ("evidenciaNota" in data ? data.evidenciaNota : actual.evidenciaNota) as string | null;
        const archivosSnapshot = actual.archivos.map((a) => ({ nombre: a.nombre, url: a.url, tipo: a.tipo }));
        const tieneEvidencia = (!!notaSnapshot && notaSnapshot.trim().length > 0) || archivosSnapshot.length > 0;
        let historialJSON: string | undefined;
        let archivosAEliminar: string[] | undefined;
        if (tieneEvidencia) {
          const entrada = {
            fechaOcurrencia: actual.fecha ? actual.fecha.toISOString() : null,
            completadaAt: new Date().toISOString(),
            completadaPorId: session.id,
            completadaPor: session.name ?? null,
            tipoEvidencia: actual.tipoEvidencia ?? null,
            evidenciaNota: notaSnapshot ?? null,
            archivos: archivosSnapshot,
            estadoVerificacion: data.estadoVerificacion ?? "NO_REQUIERE",
          };
          let prev: unknown[] = [];
          try {
            const parsed = actual.evidenciasHistorial ? JSON.parse(actual.evidenciasHistorial) : [];
            if (Array.isArray(parsed)) prev = parsed;
          } catch { /* historial corrupto → se reinicia */ }
          historialJSON = JSON.stringify([entrada, ...prev].slice(0, 60));
          // Los archivos son la evidencia (FOTO/ARCHIVO): se desligan para que la
          // siguiente ocurrencia no herede fotos viejas. Quedan preservados en el
          // snapshot del historial por su URL.
          if (actual.tipoEvidencia === "FOTO" || actual.tipoEvidencia === "ARCHIVO") {
            archivosAEliminar = actual.archivos.map((a) => a.id);
          }
        }
        reagendar = { proximaFecha: prox, fechaAnterior: actual.fecha, historialJSON, archivosAEliminar };
      } catch {
        // recurrencia inválida → se completa como tarea normal
      }
    }
  }

  // Auto-manage fechaCompletada
  if ("estado" in data) {
    data.fechaCompletada = data.estado === "COMPLETADA" ? new Date() : null;
    // Reabrir: al salir de COMPLETADA se vuelve a estado sin verificación pendiente
    if (data.estado !== "COMPLETADA") data.estadoVerificacion = "NO_REQUIERE";
  }

  // Reagendado de recurrente: la misma tarea sigue PENDIENTE pero con nueva fecha.
  // Se limpia la evidencia para que la siguiente ocurrencia exija evidencia fresca.
  if (reagendar) {
    data.estado = "PENDIENTE";
    data.fecha = reagendar.proximaFecha;
    data.fechaCompletada = null;
    data.estadoVerificacion = "NO_REQUIERE";
    data.evidenciaNota = null;
    data.evidenciaEnviadaAt = null;
    data.evidenciaEnviadaCanal = null;
    data.motivoRechazo = null;
    if (reagendar.historialJSON) data.evidenciasHistorial = reagendar.historialJSON;
    if (reagendar.archivosAEliminar?.length) {
      await prisma.tareaArchivo.deleteMany({ where: { id: { in: reagendar.archivosAEliminar } } });
    }
  }

  // Al asignar/cambiar la recurrencia (fuera del flujo de completar), anclar la
  // `fecha` a la próxima ejecución real: primera ocurrencia >= hoy (incluye hoy
  // si el patrón cae hoy). Así la tarea muestra su fecha concreta, se ordena por
  // cercanía y aparece en "Próximas". Respeta una fecha explícita del cliente.
  if (!reagendar && "recurrencia" in data && data.recurrencia && !("fecha" in body)) {
    try {
      const cfg = JSON.parse(data.recurrencia) as RecurrenciaConfig;
      const hoyCST = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }));
      data.fecha = primeraOcurrencia(cfg, hoyCST);
    } catch {
      // recurrencia inválida → no tocar la fecha
    }
  }

  // Nota: al mover manualmente la `fecha` de una tarea recurrente se respeta la
  // fecha elegida tal cual (ej. mover una tarea lun/vie a un miércoles la deja el
  // miércoles). La recurrencia se vuelve a aplicar al COMPLETARLA: el bloque de
  // `reagendar` avanza a la siguiente ocurrencia preestablecida del patrón.

  // Capture previous assignee before updating (only when assignment is being changed)
  const prevAssignee = "asignadoAId" in data
    ? await prisma.tarea.findUnique({ where: { id }, select: { asignadoAId: true } })
    : null;

  // ── Co-responsables: reemplaza el set completo si el cliente lo manda ──────
  let coNuevos: string[] = [];
  if ("colaboradorIds" in body) {
    const asignadoFinal: string | null = "asignadoAId" in body
      ? (body.asignadoAId || null)
      : (prevAssignee?.asignadoAId
          ?? (await prisma.tarea.findUnique({ where: { id }, select: { asignadoAId: true } }))?.asignadoAId
          ?? null);
    const limpios: string[] = Array.isArray(body.colaboradorIds)
      ? [...new Set((body.colaboradorIds as unknown[]).filter((x): x is string => typeof x === "string" && !!x && x !== asignadoFinal))]
      : [];
    const previos = await prisma.tareaColaborador.findMany({ where: { tareaId: id }, select: { usuarioId: true } });
    const previosSet = new Set(previos.map((p) => p.usuarioId));
    coNuevos = limpios.filter((uid) => !previosSet.has(uid) && uid !== session.id);
    data.colaboradores = {
      deleteMany: {},
      create: limpios.map((usuarioId) => ({ usuarioId })),
    };
  }

  const tarea = await prisma.tarea.update({ where: { id }, data, select: SELECT });

  if (coNuevos.length > 0) {
    await prisma.notificacion.createMany({
      data: coNuevos.map((usuarioId) => ({
        usuarioId,
        tipo:    "TAREA",
        titulo:  tarea.titulo,
        mensaje: `${session.name} te sumó como co-responsable`,
        url:     `/operaciones?open=${id}`,
      })),
    });
  }

  // ── Notify assignee when task is assigned to someone else ────────────────
  if (
    "asignadoAId" in data &&
    data.asignadoAId &&
    data.asignadoAId !== session.id &&
    data.asignadoAId !== prevAssignee?.asignadoAId
  ) {
    await prisma.notificacion.create({
      data: {
        usuarioId: data.asignadoAId as string,
        tipo:      "TAREA",
        titulo:    tarea.titulo,
        mensaje:   `${session.name} te asignó esta tarea`,
        url:       `/operaciones?open=${id}`,
      },
    });
  }

  // ── Avance de subetapa por hito ──────────────────────────────────────────
  // Si se completó de verdad una tarea-hito (su paso tiene `avanzaSubetapaA`), el
  // trato avanza a esa subetapa. "No fue necesario" no dispara avance.
  let subetapaAvanzada: string | null = null;
  if ("estado" in data && data.estado === "COMPLETADA" && !reagendar && !marcarNoNecesario) {
    try { subetapaAvanzada = await avanzarPorHito(id); }
    catch { /* el avance no debe romper la actualización de la tarea */ }
  }

  // Si se reagendó una recurrente, informamos al cliente para el toast/undo.
  // `fechaAnterior` permite deshacer (regresar la tarea a su fecha previa).
  return NextResponse.json({
    tarea,
    reagendada: !!reagendar,
    fechaAnterior: reagendar?.fechaAnterior ?? null,
    subetapaAvanzada,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  const { id } = await params;

  if (session.role !== "ADMIN") {
    const tarea = await prisma.tarea.findUnique({
      where: { id },
      select: { creadoPorId: true },
    });
    if (tarea?.creadoPorId !== session.id) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
  }

  await prisma.tarea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
