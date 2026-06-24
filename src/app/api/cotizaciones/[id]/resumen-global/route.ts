import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET /api/cotizaciones/[id]/resumen-global
 * Devuelve todas las cotizaciones del mismo trato (o grupo) con sus totales,
 * calculando el gran total del proyecto completo.
 *
 * Si la cotización tiene tratoId, devuelve todas las del trato (agrupadas por grupoId).
 * Si no tiene tratoId pero tiene grupoId, devuelve las del grupo.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    select: {
      id: true,
      tratoId: true,
      grupoId: true,
      clienteId: true,
      cliente: { select: { id: true, nombre: true, empresa: true } },
      trato: {
        select: {
          id: true,
          nombreEvento: true,
          responsable: { select: { name: true } },
        },
      },
    },
  });

  if (!cotizacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Obtener todas las cotizaciones del trato (o del grupo si no hay trato)
  let todasCotizaciones;

  if (cotizacion.tratoId) {
    // Cotizaciones del trato — agrupadas: solo tomamos la "principal" de cada grupo
    // (la que tiene opcionLetra = "A" o la primera si no hay grupo)
    todasCotizaciones = await prisma.cotizacion.findMany({
      where: { tratoId: cotizacion.tratoId },
      select: {
        id: true,
        numeroCotizacion: true,
        nombreCotizacion: true,
        descripcionCotizacion: true,
        opcionLetra: true,
        grupoId: true,
        estado: true,
        nombreEvento: true,
        fechaEvento: true,
        lugarEvento: true,
        total: true,
        aplicaIva: true,
        montoIva: true,
        granTotal: true,
        proyecto: { select: { id: true, numeroProyecto: true, estado: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  } else if (cotizacion.grupoId) {
    todasCotizaciones = await prisma.cotizacion.findMany({
      where: { grupoId: cotizacion.grupoId },
      select: {
        id: true,
        numeroCotizacion: true,
        nombreCotizacion: true,
        descripcionCotizacion: true,
        opcionLetra: true,
        grupoId: true,
        estado: true,
        nombreEvento: true,
        fechaEvento: true,
        lugarEvento: true,
        total: true,
        aplicaIva: true,
        montoIva: true,
        granTotal: true,
        proyecto: { select: { id: true, numeroProyecto: true, estado: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  } else {
    // Cotización individual sin trato ni grupo
    todasCotizaciones = [
      await prisma.cotizacion.findUnique({
        where: { id },
        select: {
          id: true,
          numeroCotizacion: true,
          nombreCotizacion: true,
          descripcionCotizacion: true,
          opcionLetra: true,
          grupoId: true,
          estado: true,
          nombreEvento: true,
          fechaEvento: true,
          lugarEvento: true,
          total: true,
          aplicaIva: true,
          montoIva: true,
          granTotal: true,
          proyecto: { select: { id: true, numeroProyecto: true, estado: true } },
          createdAt: true,
        },
      }),
    ].filter(Boolean);
  }

  // Agrupar por grupoId: para cada grupo, mostrar la cotización APROBADA si existe,
  // o la de mejor estado (ENVIADA > BORRADOR), o la primera
  const estadoPrioridad: Record<string, number> = {
    APROBADA: 5,
    ENVIADA: 4,
    REENVIADA: 3,
    EN_REVISION: 2,
    BORRADOR: 1,
    RECHAZADA: 0,
    VENCIDA: 0,
  };

  // Agrupar por grupoId (o id si no tiene grupo)
  const gruposMap = new Map<string, typeof todasCotizaciones>();
  for (const cot of todasCotizaciones) {
    const key = (cot as { grupoId?: string | null }).grupoId ?? cot!.id;
    if (!gruposMap.has(key)) gruposMap.set(key, []);
    gruposMap.get(key)!.push(cot as NonNullable<typeof cot>);
  }

  // Representante de cada grupo = la de mayor estado
  const eventosPrincipales = Array.from(gruposMap.values()).map(grupo => {
    return grupo.reduce((mejor, actual) => {
      if (!mejor) return actual;
      if (!actual) return mejor;
      const pMejor = estadoPrioridad[mejor.estado] ?? 0;
      const pActual = estadoPrioridad[actual.estado] ?? 0;
      return pActual > pMejor ? actual : mejor;
    });
  });

  // Calcular totales del resumen global
  const totalBruto = eventosPrincipales.reduce((s, c) => s + (c?.total ?? 0), 0);
  const totalIva = eventosPrincipales.reduce((s, c) => s + (c?.montoIva ?? 0), 0);
  const granTotalProyecto = eventosPrincipales.reduce((s, c) => s + (c?.granTotal ?? 0), 0);

  return NextResponse.json({
    tratoId: cotizacion.tratoId,
    trato: cotizacion.trato,
    cliente: cotizacion.cliente,
    eventos: eventosPrincipales,
    totales: {
      totalBruto,
      totalIva,
      granTotalProyecto,
      numeroEventos: eventosPrincipales.length,
    },
  });
}
