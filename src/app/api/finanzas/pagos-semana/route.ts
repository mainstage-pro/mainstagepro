import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET /api/finanzas/pagos-semana
 *
 * Devuelve CxP pendientes/parciales agrupadas por semana (lunes a domingo).
 * Query params:
 *   tipo = TECNICO | PROVEEDOR (default: ambos)
 *   semanas = cuántas semanas a futuro incluir (default: 6)
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipo = req.nextUrl.searchParams.get("tipo"); // TECNICO | PROVEEDOR | null = ambos

  const where: Record<string, unknown> = {
    estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDO"] },
  };
  if (tipo) where.tipoAcreedor = tipo;
  else where.tipoAcreedor = { in: ["TECNICO", "PROVEEDOR"] };

  const cxps = await prisma.cuentaPagar.findMany({
    where,
    include: {
      tecnico: { select: { id: true, nombre: true, celular: true, rol: { select: { nombre: true } } } },
      proveedor: { select: { id: true, nombre: true, telefono: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true, cliente: { select: { nombre: true } } } },
    },
    orderBy: [{ fechaCompromiso: "asc" }, { tipoAcreedor: "asc" }],
  });

  // Agrupar por semana (lunes → domingo de fechaCompromiso)
  function isoWeekKey(d: Date): string {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    const day = dt.getDay(); // 0=dom
    const diff = (day === 0 ? -6 : 1 - day);
    dt.setDate(dt.getDate() + diff); // lunes de esa semana
    return dt.toISOString().slice(0, 10);
  }

  const grupos: Record<string, {
    lunesIso: string;
    miercolesIso: string;
    items: typeof cxps;
  }> = {};

  for (const cxp of cxps) {
    const lunes = isoWeekKey(cxp.fechaCompromiso);
    if (!grupos[lunes]) {
      // Calcular el miércoles de esa semana
      const ldt = new Date(lunes + "T12:00:00Z");
      ldt.setDate(ldt.getDate() + 2); // lunes + 2 = miércoles
      grupos[lunes] = {
        lunesIso: lunes,
        miercolesIso: ldt.toISOString().slice(0, 10),
        items: [],
      };
    }
    grupos[lunes].items.push(cxp);
  }

  const semanas = Object.values(grupos).sort((a, b) => a.lunesIso.localeCompare(b.lunesIso));

  // Totales por semana
  const resultado = semanas.map(s => ({
    lunesIso: s.lunesIso,
    miercolesIso: s.miercolesIso,
    totalMonto: s.items.reduce((acc, i) => acc + i.monto, 0),
    items: s.items,
  }));

  return NextResponse.json({ semanas: resultado });
}
