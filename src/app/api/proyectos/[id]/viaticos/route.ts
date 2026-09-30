import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { personasDeProyecto } from "@/lib/viaticos";
import { montoDeFila, personasCotizadas, sembrarViaticosProyecto } from "@/lib/viaticos-proyecto";

/**
 * Comidas y viáticos del proyecto: lo que hay que comprar antes del evento y la
 * autorización para soltar el dinero.
 *
 * El GET siembra lo que falte desde las cotizaciones del proyecto, para que un evento
 * que ya existía no llegue con el cuadro vacío. Sembrar es idempotente.
 */

async function cotizacionesDelProyecto(proyectoId: string): Promise<string[]> {
  const p = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { cotizacionId: true, cotizacionesFusionadas: { select: { id: true } } },
  });
  if (!p) return [];
  return [p.cotizacionId, ...p.cotizacionesFusionadas.map((c) => c.id)].filter(Boolean);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  for (const cotizacionId of await cotizacionesDelProyecto(id)) {
    await sembrarViaticosProyecto(id, cotizacionId);
  }

  const [filas, personal, cotizaciones] = await Promise.all([
    prisma.gastoOperativo.findMany({ where: { proyectoId: id }, orderBy: { createdAt: "asc" } }),
    prisma.proyectoPersonal.findMany({
      where: { proyectoId: id, necesitaRevision: false },
      select: { tecnicoId: true, fechaJornada: true },
    }),
    prisma.cotizacion.findMany({
      where: { OR: [{ proyecto: { id } }, { proyectoFusionado: { id } }] },
      select: {
        personasViaticos: true,
        jornadasPlan: true,
        lineas: { select: { tipo: true, notas: true, cantidad: true } },
      },
    }),
  ]);

  return NextResponse.json({
    viaticos: filas,
    // Las dos cifras que coordinación compara: lo que se cotizó y lo que de verdad va.
    personasProyecto: personasDeProyecto(personal),
    personasCotizadas: cotizaciones.reduce((s, c) => s + personasCotizadas(c), 0),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const proyecto = await prisma.proyecto.findUnique({ where: { id }, select: { id: true } });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const desglose = {
    personas: body.personas != null ? parseInt(body.personas) || 0 : null,
    porDia: body.porDia != null ? parseInt(body.porDia) || 1 : 1,
    dias: body.dias != null ? parseInt(body.dias) || 1 : 1,
    costoUnitario: parseFloat(body.costoUnitario) || 0,
  };

  const viatico = await prisma.gastoOperativo.create({
    data: {
      proyectoId: id,
      tipo: body.tipo || "OTRO",
      concepto: (body.concepto || "").trim() || "Viáticos",
      modalidad: body.modalidad === "SERVICIO" ? "SERVICIO" : "EFECTIVO",
      responsable: body.responsable || null,
      notas: body.notas || null,
      ...desglose,
      monto: montoDeFila(desglose),
      cantidad: Math.max(1, (desglose.personas ?? 1) * desglose.porDia),
    },
  });

  return NextResponse.json({ viatico });
}
