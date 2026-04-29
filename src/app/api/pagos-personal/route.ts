import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Calculates the Wednesday of the cycle that contains a given event date
function cicloDesde(cicloDate: Date): { desde: Date; hasta: Date } {
  const ciclo = new Date(cicloDate);
  ciclo.setHours(12, 0, 0, 0);
  const desde = new Date(ciclo);
  desde.setDate(desde.getDate() - 6);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(ciclo);
  hasta.setDate(hasta.getDate() - 1);
  hasta.setHours(23, 59, 59, 999);
  return { desde, hasta };
}

// GET /api/pagos-personal?ciclo=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cicloStr = req.nextUrl.searchParams.get("ciclo");
  const cicloDate = cicloStr
    ? new Date(cicloStr + "T12:00:00Z")
    : (() => {
        const d = new Date();
        const dow = d.getDay();
        d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
        return d;
      })();

  const { desde, hasta } = cicloDesde(cicloDate);

  const proyectos = await prisma.proyecto.findMany({
    where: { fechaEvento: { gte: desde, lte: hasta }, personal: { some: {} } },
    include: {
      cliente: { select: { nombre: true } },
      cotizacion: { select: { subtotalOperacion: true } },
      personal: {
        include: {
          tecnico: { select: { id: true, nombre: true } },
          rolTecnico: { select: { nombre: true } },
        },
        orderBy: [{ participacion: "asc" }, { fechaJornada: "asc" }, { id: "asc" }],
      },
    },
    orderBy: { fechaEvento: "asc" },
  });

  // Build per-project data
  const proyectosData = proyectos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    cliente: p.cliente?.nombre ?? "",
    fechaEvento: p.fechaEvento?.toISOString().slice(0, 10) ?? "",
    presupuestoOp: p.cotizacion?.subtotalOperacion ?? 0,
    personal: p.personal.map((pp) => ({
      id: pp.id,
      tecnicoId: pp.tecnicoId,
      tecnicoNombre: pp.tecnico?.nombre ?? null,
      rolNombre: pp.rolTecnico?.nombre ?? null,
      participacion: pp.participacion,
      fechaJornada: pp.fechaJornada,
      nivel: pp.nivel,
      jornada: pp.jornada,
      tarifaAcordada: pp.tarifaAcordada,
      estadoPago: pp.estadoPago,
    })),
  }));

  // Build nomina: aggregate by technician across all projects
  const tecMap = new Map<
    string,
    {
      tecnicoId: string;
      tecnicoNombre: string;
      pagos: { proyectoId: string; proyectoNombre: string; monto: number; estadoPago: string }[];
    }
  >();

  for (const p of proyectos) {
    for (const pp of p.personal) {
      if (!pp.tecnicoId || !pp.tecnico || pp.tarifaAcordada == null) continue;
      const key = pp.tecnicoId;
      if (!tecMap.has(key)) {
        tecMap.set(key, { tecnicoId: pp.tecnicoId, tecnicoNombre: pp.tecnico.nombre, pagos: [] });
      }
      const entry = tecMap.get(key)!;
      // Accumulate within the same project (may work multiple jornadas)
      const existing = entry.pagos.find((x) => x.proyectoId === p.id);
      if (existing) {
        existing.monto += pp.tarifaAcordada;
        if (pp.estadoPago !== "PAGADO") existing.estadoPago = "PENDIENTE";
      } else {
        entry.pagos.push({
          proyectoId: p.id,
          proyectoNombre: p.nombre,
          monto: pp.tarifaAcordada,
          estadoPago: pp.estadoPago,
        });
      }
    }
  }

  const nomina = Array.from(tecMap.values())
    .map((t) => ({
      ...t,
      total: t.pagos.reduce((s, x) => s + x.monto, 0),
      todosPagados: t.pagos.every((x) => x.estadoPago === "PAGADO"),
    }))
    .sort((a, b) => a.tecnicoNombre.localeCompare(b.tecnicoNombre));

  return NextResponse.json({
    ciclo: cicloDate.toISOString().slice(0, 10),
    desde: desde.toISOString().slice(0, 10),
    hasta: hasta.toISOString().slice(0, 10),
    proyectos: proyectosData,
    nomina,
  });
}

// POST /api/pagos-personal  — mark technician as paid for the cycle
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { tecnicoId, proyectoIds } = body as { tecnicoId: string; proyectoIds: string[] };

  if (!tecnicoId || !proyectoIds?.length) {
    return NextResponse.json({ error: "tecnicoId y proyectoIds requeridos" }, { status: 400 });
  }

  const [personalUpdate, cxpUpdate] = await prisma.$transaction([
    // Mark personal slots as paid
    prisma.proyectoPersonal.updateMany({
      where: { tecnicoId, proyectoId: { in: proyectoIds }, estadoPago: "PENDIENTE" },
      data: { estadoPago: "PAGADO" },
    }),
    // Mark matching CxP as liquidado
    prisma.cuentaPagar.updateMany({
      where: { tecnicoId, proyectoId: { in: proyectoIds }, tipoAcreedor: "TECNICO", estado: "PENDIENTE" },
      data: { estado: "LIQUIDADO" },
    }),
  ]);

  return NextResponse.json({ personalActualizados: personalUpdate.count, cxpActualizadas: cxpUpdate.count });
}
