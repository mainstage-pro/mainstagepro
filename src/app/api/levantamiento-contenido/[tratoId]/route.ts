import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tratoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { tratoId } = await params;
  const levantamiento = await prisma.levantamientoContenido.findUnique({ where: { tratoId } });
  return NextResponse.json({ levantamiento });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tratoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { tratoId } = await params;
  const body = await req.json();

  const {
    nombreEvento, tipoEvento, fecha, horarioEvento, horarioCobertura, lugar,
    nombreCliente, redesSocialesCliente, tieneProveedoresAdicionales, proveedoresDetalle,
    objetivosContenido, detalleObjetivo, planCobertura, planCoberturaOtro,
    temasSugeridos, colaboradoresCamara, colaboradoresNombres, notasAdicionales,
  } = body;

  const data = {
    nombreEvento: nombreEvento ?? null,
    tipoEvento: tipoEvento ?? null,
    fecha: fecha ? new Date(fecha) : null,
    horarioEvento: horarioEvento ?? null,
    horarioCobertura: horarioCobertura ?? null,
    lugar: lugar ?? null,
    nombreCliente: nombreCliente ?? null,
    redesSocialesCliente: redesSocialesCliente ?? null,
    tieneProveedoresAdicionales: tieneProveedoresAdicionales ?? null,
    proveedoresDetalle: proveedoresDetalle ?? null,
    objetivosContenido: Array.isArray(objetivosContenido) ? JSON.stringify(objetivosContenido) : (objetivosContenido ?? null),
    detalleObjetivo: detalleObjetivo ?? null,
    planCobertura: planCobertura ?? null,
    planCoberturaOtro: planCoberturaOtro ?? null,
    temasSugeridos: temasSugeridos ?? null,
    colaboradoresCamara: colaboradoresCamara ?? null,
    colaboradoresNombres: colaboradoresNombres ?? null,
    notasAdicionales: notasAdicionales ?? null,
  };

  const existia = await prisma.levantamientoContenido.findUnique({ where: { tratoId }, select: { id: true } });

  const levantamiento = await prisma.levantamientoContenido.upsert({
    where: { tratoId },
    create: { tratoId, ...data },
    update: { ...data },
  });

  // Notificar a usuarios de marketing cuando se crea un levantamiento nuevo
  if (!existia && nombreEvento) {
    const marketingUsers = await prisma.user.findMany({
      where: { area: "MARKETING", active: true },
      select: { id: true },
    });
    if (marketingUsers.length > 0) {
      await prisma.notificacion.createMany({
        data: marketingUsers.map(u => ({
          usuarioId: u.id,
          tipo: "LEVANTAMIENTO",
          titulo: "Nuevo levantamiento de contenido",
          mensaje: `Se agendó un levantamiento para "${nombreEvento}"${planCobertura ? ` — Plan ${planCobertura}` : ""}${fecha ? ` el ${new Date(fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}` : ""}.`,
          url: `/marketing/levantamientos`,
          metadata: JSON.stringify({ tratoId, levantamientoId: levantamiento.id }),
        })),
      });
    }
  }

  return NextResponse.json({ levantamiento });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ tratoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { tratoId } = await params;
  const body = await req.json();
  const { scoreFotoVideo, recomendacionFotoVideo } = body;

  const levantamiento = await prisma.levantamientoContenido.update({
    where: { tratoId },
    data: {
      scoreFotoVideo: scoreFotoVideo ?? null,
      recomendacionFotoVideo: recomendacionFotoVideo ?? null,
    },
  });

  return NextResponse.json({ levantamiento });
}
