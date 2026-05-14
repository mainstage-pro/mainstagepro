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

  // Cuentas bancarias para el modal
  const cuentas = await prisma.cuentaBancaria.findMany({
    select: { id: true, nombre: true, banco: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({
    ciclo: cicloDate.toISOString().slice(0, 10),
    desde: desde.toISOString().slice(0, 10),
    hasta: hasta.toISOString().slice(0, 10),
    proyectos: proyectosData,
    nomina,
    cuentas,
  });
}

interface PagoEntrada {
  monto: number;
  metodoPago: string;
  cuentaOrigenId?: string | null;
  referencia?: string | null;
}

// POST /api/pagos-personal — register technician payment(s)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    tecnicoId,
    proyectoIds,
    fecha,
    notas,
    // Multi-entry format
    entradas,
    // Legacy single-entry fields (backward compat)
    cuentaOrigenId,
    metodoPago = "TRANSFERENCIA",
    referencia,
  } = body as {
    tecnicoId: string;
    proyectoIds: string[];
    fecha?: string;
    notas?: string;
    entradas?: PagoEntrada[];
    cuentaOrigenId?: string;
    metodoPago?: string;
    referencia?: string;
  };

  if (!tecnicoId || !proyectoIds?.length) {
    return NextResponse.json({ error: "tecnicoId y proyectoIds requeridos" }, { status: 400 });
  }

  const tecnico = await prisma.tecnico.findUnique({
    where: { id: tecnicoId },
    select: { nombre: true },
  });

  // CxPs pendientes del técnico en estos proyectos
  const cxps = await prisma.cuentaPagar.findMany({
    where: {
      tecnicoId,
      proyectoId: { in: proyectoIds },
      tipoAcreedor: "TECNICO",
      estado: "PENDIENTE",
    },
  });

  const totalOwed = cxps.reduce((s, c) => s + c.monto, 0);
  const fechaPago = fecha ? new Date(fecha + "T12:00:00Z") : new Date();

  if (entradas && entradas.length > 0) {
    // ── Multi-entry path ────────────────────────────────────────────────────
    const validEntradas = entradas.filter((e) => e.monto > 0);
    if (!validEntradas.length) {
      return NextResponse.json({ error: "Al menos una entrada con monto > 0 es requerida" }, { status: 400 });
    }

    const totalPagado = validEntradas.reduce((s, e) => s + e.monto, 0);
    const fullyPaid = totalOwed > 0 ? totalPagado >= totalOwed - 0.01 : true;
    const movIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      // Create one movimiento per entrada
      for (const entrada of validEntradas) {
        const mov = await tx.movimientoFinanciero.create({
          data: {
            tipo: "GASTO",
            fecha: fechaPago,
            concepto: `Nómina — ${tecnico?.nombre ?? tecnicoId}`,
            monto: entrada.monto,
            metodoPago: entrada.metodoPago || "TRANSFERENCIA",
            cuentaOrigenId: entrada.cuentaOrigenId || null,
            referencia: entrada.referencia || null,
            notas: notas || null,
            proyectoId: cxps[0]?.proyectoId ?? proyectoIds[0],
            creadoPor: session.id,
          },
        });
        movIds.push(mov.id);
      }

      if (fullyPaid) {
        await tx.proyectoPersonal.updateMany({
          where: { tecnicoId, proyectoId: { in: proyectoIds }, estadoPago: "PENDIENTE" },
          data: { estadoPago: "PAGADO" },
        });

        // Link each CxP to a distinct movimiento (unique constraint on movimientoId)
        // Extra CxPs beyond the movimiento count get marked LIQUIDADO without a link
        for (let i = 0; i < cxps.length; i++) {
          const movId = movIds[i] ?? null;
          await tx.cuentaPagar.update({
            where: { id: cxps[i].id },
            data: { estado: "LIQUIDADO", ...(movId ? { movimientoId: movId } : {}) },
          });
        }
      }
    });

    return NextResponse.json({ ok: true, movimientosCreados: movIds.length, totalPagado, fullyPaid });
  } else {
    // ── Legacy single-entry path (one movimiento per CxP, original behavior) ─
    await prisma.$transaction(async (tx) => {
      await tx.proyectoPersonal.updateMany({
        where: { tecnicoId, proyectoId: { in: proyectoIds }, estadoPago: "PENDIENTE" },
        data: { estadoPago: "PAGADO" },
      });

      for (const cxp of cxps) {
        const mov = await tx.movimientoFinanciero.create({
          data: {
            tipo: "GASTO",
            fecha: fechaPago,
            concepto: `Nómina — ${tecnico?.nombre ?? tecnicoId}`,
            monto: cxp.monto,
            metodoPago,
            cuentaOrigenId: cuentaOrigenId || null,
            referencia: referencia || null,
            notas: notas || null,
            proyectoId: cxp.proyectoId,
            creadoPor: session.id,
          },
        });

        await tx.cuentaPagar.update({
          where: { id: cxp.id },
          data: { estado: "LIQUIDADO", movimientoId: mov.id },
        });
      }
    });

    return NextResponse.json({ ok: true, movimientosCreados: cxps.length, fullyPaid: true });
  }
}
