import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calcularAvanceProyecto } from "@/lib/proyecto-avance";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const lugarEvento = url.searchParams.get("lugarEvento");

  const where: Record<string, unknown> = {};
  if (lugarEvento) where.lugarEvento = { contains: lugarEvento, mode: 'insensitive' };

  const fechaDesde = url.searchParams.get('fechaDesde');
  const fechaHasta = url.searchParams.get('fechaHasta');
  const estado     = url.searchParams.get('estado');

  if (fechaDesde || fechaHasta) {
    where.fechaEvento = {};
    if (fechaDesde) (where.fechaEvento as Record<string, unknown>).gte = new Date(fechaDesde + 'T00:00:00');
    if (fechaHasta) (where.fechaEvento as Record<string, unknown>).lte = new Date(fechaHasta + 'T23:59:59');
  }
  if (estado) where.estado = estado;

  // Non-admins: filter by specific project accesses if any are set
  if (session.role !== "ADMIN") {
    const accesos = await prisma.moduloAcceso.findMany({
      where: { userId: session.id, moduloKey: { startsWith: "proyecto:" } },
      select: { moduloKey: true },
    });
    if (accesos.length > 0) {
      const proyectoIds = accesos.map(a => a.moduloKey.replace("proyecto:", ""));
      where.id = { in: proyectoIds };
    }
  }

  try {
    const proyectos = await prisma.proyecto.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true, empresa: true } },
        encargado: { select: { name: true } },
        personal: { select: { confirmado: true } },
        trato: { select: { responsable: { select: { name: true } } } },
        cotizacion: { select: { id: true, granTotal: true } },
        equipos: { select: { id: true }, take: 1 },
        cuentasCobrar: { select: { id: true, tipoPago: true, estado: true } },
        checklist: { select: { completado: true, item: true } },
        _count: { select: { equipos: true } },
      },
      orderBy: { fechaEvento: "desc" },
    });
    const allowedNames = ["mauricio", "emiliano", "carlos"];
    const canViewFinances = allowedNames.some(name => session.name.toLowerCase().includes(name));

    const proyectosConAvance = proyectos.map(p => {
      const avance = calcularAvanceProyecto({
        tipoServicio: p.tipoServicio ?? null,
        planProduccionAprobado: p.planProduccionAprobado,
        recoleccionStatus: p.recoleccionStatus,
        checklist: p.checklist,
        equiposCount: p._count?.equipos ?? 0,
      });
      const liquidacionCobrada = (p.cuentasCobrar ?? []).some(
        (c: { tipoPago: string; estado: string }) =>
          c.tipoPago === 'LIQUIDACION' && c.estado === 'COBRADA'
      );
      return {
        ...p,
        avance,
        liquidacionCobrada,
        cotizacion: canViewFinances ? p.cotizacion : null,
      };
    });
    return NextResponse.json({ proyectos: proyectosConAvance });
  } catch (e) {
    console.error("[/api/proyectos GET]", e);
    return NextResponse.json({ error: String(e), proyectos: [] }, { status: 500 });
  }
}
