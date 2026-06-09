import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generarInstanciasDelDia } from "@/lib/plan-trabajo/motor";

// GET /api/plan-trabajo/instancias?fecha=2026-05-27&vista=dia|semana|todas
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fechaParam = searchParams.get("fecha");
  const vista = searchParams.get("vista") ?? "dia";
  const areaFiltro = searchParams.get("area"); // filtro para vista de dirección
  const userFiltro = searchParams.get("userId"); // filtro para vista de dirección
  const pendientesAnteriores = searchParams.get("pendientesAnteriores") === "true";

  // ── Pendientes de días anteriores ────────────────────────────────────────────
  if (pendientesAnteriores) {
    const tzLocal = "America/Mexico_City";
    const hoyStr = new Date().toLocaleDateString("en-CA", { timeZone: tzLocal });
    const hoyInicio = new Date(`${hoyStr}T00:00:00.000-06:00`);
    const hace14Dias = new Date(hoyInicio);
    hace14Dias.setDate(hoyInicio.getDate() - 14);

    const atrasadas = await prisma.pTTareaInstancia.findMany({
      where: {
        fechaVencimiento: { gte: hace14Dias, lt: hoyInicio },
        estado: { in: ["PENDIENTE", "EN_PROGRESO"] },
        OR: [
          { responsableId: session.id },
          { template: { puestoDefault: "Todo el equipo" } },
        ],
      },
      include: {
        template: { include: { area: true, subArea: true } },
        responsable: { select: { id: true, name: true, email: true } },
        subtareasInstancia: { include: { subtarea: true }, orderBy: { subtarea: { orden: "asc" } } },
        comentarios: {
          include: { autor: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
          take: 10,
        },
        historial: {
          include: { usuario: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { fechaVencimiento: "desc" },
    });

    return NextResponse.json({ instancias: atrasadas });
  }

  const tz = "America/Mexico_City";
  const hoy = fechaParam
    ? new Date(fechaParam + "T12:00:00.000-06:00")
    : new Date();

  const dateStr = hoy.toLocaleDateString("en-CA", { timeZone: tz });

  let fechaInicio: Date;
  let fechaFin: Date;

  if (vista === "semana") {
    const dow = hoy.getDay(); // 0=dom
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((dow + 6) % 7));
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    const lunesStr = lunes.toLocaleDateString("en-CA", { timeZone: tz });
    const domingoStr = domingo.toLocaleDateString("en-CA", { timeZone: tz });
    fechaInicio = new Date(`${lunesStr}T00:00:00.000-06:00`);
    fechaFin    = new Date(`${domingoStr}T23:59:59.999-06:00`);
  } else if (vista === "todas") {
    fechaInicio = new Date("2020-01-01");
    fechaFin    = new Date("2099-12-31");
  } else {
    fechaInicio = new Date(`${dateStr}T00:00:00.000-06:00`);
    fechaFin    = new Date(`${dateStr}T23:59:59.999-06:00`);
  }

  const isAdmin = session.role === "ADMIN" || session.role === "DIRECTOR";

  // Always filter by the logged-in user unless admin passes explicit userId
  const responsableId = isAdmin && userFiltro ? userFiltro : session.id;

  const instancias = await prisma.pTTareaInstancia.findMany({
    where: {
      fechaVencimiento: { gte: fechaInicio, lte: fechaFin },
      ...(areaFiltro ? { template: { areaId: areaFiltro } } : {}),
      OR: [
        { responsableId },
        { template: { puestoDefault: 'Todo el equipo' } },
      ],
    },
    include: {
      template: {
        include: {
          area: true,
          subArea: true,
        },
      },
      responsable: { select: { id: true, name: true, email: true } },
      subtareasInstancia: {
        include: { subtarea: true },
        orderBy: { subtarea: { orden: "asc" } },
      },
      comentarios: {
        include: { autor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
        take: 20,
      },
      historial: {
        include: { usuario: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    orderBy: { fechaVencimiento: "asc" },
  });

  // Auto-generate if no instances for today (lazy generation)
  if (instancias.length === 0 && vista === "dia") {
    try {
      await generarInstanciasDelDia(hoy);
      // Re-fetch after generation
      const instanciasNuevas = await prisma.pTTareaInstancia.findMany({
        where: {
          fechaVencimiento: { gte: fechaInicio, lte: fechaFin },
          ...(areaFiltro ? { template: { areaId: areaFiltro } } : {}),
          OR: [
            { responsableId },
            { template: { puestoDefault: 'Todo el equipo' } },
          ],
        },
        include: {
          template: { include: { area: true, subArea: true } },
          responsable: { select: { id: true, name: true, email: true } },
          subtareasInstancia: {
            include: { subtarea: true },
            orderBy: { subtarea: { orden: "asc" } },
          },
          comentarios: {
            include: { autor: { select: { id: true, name: true } } },
            orderBy: { createdAt: "asc" },
            take: 20,
          },
          historial: {
            include: { usuario: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
        orderBy: { fechaVencimiento: "asc" },
      });
      return NextResponse.json({ instancias: instanciasNuevas, fecha: dateStr, generadas: true });
    } catch {
      // Motor failed — return empty
    }
  }

  return NextResponse.json({ instancias, fecha: dateStr });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { instanciaId, estado, nota, razonNoRealizado } = body;

  if (!instanciaId || !estado) {
    return NextResponse.json({ error: "instanciaId y estado requeridos" }, { status: 400 });
  }

  const validEstados = ["PENDIENTE", "EN_PROGRESO", "COMPLETADA", "OMITIDA", "NO_REALIZADO"];
  if (!validEstados.includes(estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const instancia = await prisma.pTTareaInstancia.update({
    where: { id: instanciaId },
    data: {
      estado,
      notas: nota ?? undefined,
      razonNoRealizado: estado === "NO_REALIZADO" ? (razonNoRealizado ?? null) : estado === "PENDIENTE" ? null : undefined,
      completadaAt: estado === "COMPLETADA" ? new Date() : null,
      completadaPorId: estado === "COMPLETADA" ? session.id : null,
    },
    include: {
      template: { include: { area: true, subArea: true } },
      responsable: { select: { id: true, name: true } },
    },
  });

  // Log historial
  await prisma.pTHistorialEjecucion.create({
    data: {
      instanciaId,
      usuarioId: session.id,
      accion: estado === "COMPLETADA" ? "COMPLETADA" : estado === "PENDIENTE" ? "REABIERTA" : estado === "NO_REALIZADO" ? "NO_REALIZADO" : "OMITIDA",
      detalles: estado === "NO_REALIZADO" ? razonNoRealizado ?? null : nota ?? null,
    },
  });

  return NextResponse.json({ instancia });
}

