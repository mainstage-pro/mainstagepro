import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";
import { calcularProximaFecha, type RecurrenciaConfig } from "@/lib/recurrencia";
import { avanzarSiTareasCompletas } from "@/lib/proceso/tareas-subetapa";

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

  const { id } = await params;
  const body   = await req.json();

  const allowed = [
    "titulo", "descripcion", "prioridad", "area", "estado",
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

  // Reagendado de recurrentes: al completar, la MISMA tarea avanza a la próxima fecha
  // (no se genera una tarea nueva). Se calcula aquí y se aplica al `data` antes del update.
  let reagendar: { proximaFecha: Date; fechaAnterior: Date | null } | null = null;

  // ── Gate de evidencia (server-side): al completar, validar según tipoEvidencia ──
  if ("estado" in data && data.estado === "COMPLETADA") {
    const actual = await prisma.tarea.findUnique({
      where: { id },
      select: {
        requiereEvidencia: true,
        tipoEvidencia: true,
        evidenciaNota: true,
        recurrencia: true,
        fecha: true,
        archivos: { select: { tipo: true } },
      },
    });
    if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

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
        reagendar = { proximaFecha: prox, fechaAnterior: actual.fecha };
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
  }

  // Capture previous assignee before updating (only when assignment is being changed)
  const prevAssignee = "asignadoAId" in data
    ? await prisma.tarea.findUnique({ where: { id }, select: { asignadoAId: true } })
    : null;

  const tarea = await prisma.tarea.update({ where: { id }, data, select: SELECT });

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

  // ── Avance de subetapa por tareas ────────────────────────────────────────
  // Si se completó una tarea ligada a un trato, y con ella se completaron todas
  // las tareas por defecto de su subetapa actual, el trato avanza solo a la
  // siguiente subetapa (instanciando sus tareas por defecto).
  let subetapaAvanzada: string | null = null;
  if ("estado" in data && data.estado === "COMPLETADA" && !reagendar) {
    const conTrato = await prisma.tarea.findUnique({ where: { id }, select: { tratoId: true } });
    if (conTrato?.tratoId) {
      try { subetapaAvanzada = await avanzarSiTareasCompletas(conTrato.tratoId); }
      catch { /* el avance no debe romper la actualización de la tarea */ }
    }
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
