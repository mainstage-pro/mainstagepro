import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET /api/finanzas/semana
 *
 * Devuelve CxC (cobros) y CxP (pagos) pendientes agrupados por semana.
 * Cada semana indica su lunes y miércoles para el ciclo operativo:
 *   - Lunes y miércoles → revisar y gestionar cobros (CxC)
 *   - Miércoles → ejecutar pagos (CxP)
 *
 * Query params:
 *   semanas = cuántas semanas a futuro incluir (default: 8)
 *   incluirVencidos = true/false (default: true)
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const semanas = parseInt(req.nextUrl.searchParams.get("semanas") ?? "8");

  // Traer CxC pendientes
  const cobros = await prisma.cuentaCobrar.findMany({
    where: {
      estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDO"] },
    },
    include: {
      cliente: { select: { id: true, nombre: true, telefono: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true } },
      cotizacion: { select: { id: true, numeroCotizacion: true } },
    },
    orderBy: [{ fechaCompromiso: "asc" }],
  });

  // Traer CxP pendientes (técnicos + proveedores + otros)
  const pagos = await prisma.cuentaPagar.findMany({
    where: {
      estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDO"] },
    },
    include: {
      tecnico: { select: { id: true, nombre: true, celular: true, rol: { select: { nombre: true } } } },
      proveedor: { select: { id: true, nombre: true, telefono: true } },
      socio: { select: { id: true, nombre: true, email: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true, cliente: { select: { nombre: true } } } },
    },
    orderBy: [{ fechaCompromiso: "asc" }, { tipoAcreedor: "asc" }],
  });

  // Agrupar por semana (lunes → domingo basado en fechaCompromiso)
  function isoWeekKey(d: Date): string {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    const day = dt.getDay(); // 0=dom
    const diff = day === 0 ? -6 : 1 - day;
    dt.setDate(dt.getDate() + diff);
    return dt.toISOString().slice(0, 10);
  }

  function miercolesDeSeamana(lunesIso: string): string {
    const d = new Date(lunesIso + "T12:00:00Z");
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }

  const grupos: Record<string, {
    lunesIso: string;
    miercolesIso: string;
    cobros: typeof cobros;
    pagos: typeof pagos;
  }> = {};

  function getOrCreate(lunes: string) {
    if (!grupos[lunes]) {
      grupos[lunes] = {
        lunesIso: lunes,
        miercolesIso: miercolesDeSeamana(lunes),
        cobros: [],
        pagos: [],
      };
    }
    return grupos[lunes];
  }

  for (const c of cobros) {
    const lunes = isoWeekKey(c.fechaCompromiso);
    getOrCreate(lunes).cobros.push(c);
  }

  for (const p of pagos) {
    const lunes = isoWeekKey(p.fechaCompromiso);
    getOrCreate(lunes).pagos.push(p);
  }

  const semanasOrdenadas = Object.values(grupos)
    .sort((a, b) => a.lunesIso.localeCompare(b.lunesIso));

  const resultado = semanasOrdenadas.map(s => ({
    lunesIso: s.lunesIso,
    miercolesIso: s.miercolesIso,
    totalCobros: s.cobros.reduce((acc, c) => acc + c.monto, 0),
    totalPagos: s.pagos.reduce((acc, p) => acc + p.monto, 0),
    cobros: s.cobros,
    pagos: s.pagos,
  }));

  // Totales globales
  const totalPendienteCobrar = cobros.reduce((a, c) => a + c.monto, 0);
  const totalPendientePagar = pagos.reduce((a, p) => a + p.monto, 0);

  return NextResponse.json({
    semanas: resultado,
    totales: {
      cobrar: totalPendienteCobrar,
      pagar: totalPendientePagar,
      balance: totalPendienteCobrar - totalPendientePagar,
    },
  });
}
