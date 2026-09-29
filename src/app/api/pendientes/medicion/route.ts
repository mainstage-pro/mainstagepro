import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { computarPendientes } from "@/lib/pendientes";

/**
 * Medición en sombra: corre TODAS las fuentes, incluidas las apagadas, y
 * devuelve sólo volumen. No entrega nada a nadie. Sirve para decidir con
 * números reales qué fuentes merecen encenderse antes de que alguien reciba
 * un solo aviso.
 */
export async function GET(request: NextRequest) {
  // Admin desde el navegador, o CRON_SECRET para leer la medición sin sesión.
  const conSecreto = request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!conSecreto && !(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { conteos, fallos, generadoEn, ms } = await computarPendientes({ incluirInactivas: true });

  const porArea: Record<string, number> = {};
  for (const c of conteos) porArea[c.area] = (porArea[c.area] ?? 0) + c.total;

  return NextResponse.json({
    generadoEn,
    ms,
    resumen: {
      fuentes: conteos.length,
      activas: conteos.filter(c => c.activa).length,
      total: conteos.reduce((s, c) => s + c.total, 0),
      visibleHoy: conteos.filter(c => c.activa).reduce((s, c) => s + c.total, 0),
      urgente: conteos.reduce((s, c) => s + c.urgente, 0),
      alta: conteos.reduce((s, c) => s + c.alta, 0),
      media: conteos.reduce((s, c) => s + c.media, 0),
      truncadas: conteos.filter(c => c.truncado).map(c => c.fuente),
      porArea,
    },
    conteos,
    fallos,
  });
}
