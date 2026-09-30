import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sincronizarProyectoDesdeCotizacion } from "@/lib/sync-cotizacion-proyecto";

/**
 * Fusiona una cotización aprobada a un proyecto que ya existe.
 *
 * El cliente pide facturas separadas de un mismo evento: cada cotización sigue
 * viva y se cobra sola, pero su equipo y su personal se operan en un solo
 * proyecto. Si la cotización ya había generado proyecto propio, ese proyecto se
 * absorbe: su contenido se muda al anfitrión y la cáscara vacía se elimina.
 *
 * Cada fila movida conserva el sello `cotizacionId`, que es lo que permite al
 * motor de sync tocar solo lo suyo y distinguir el origen en la operación.
 */

// Los hijos del proyecto absorbido que representan trabajo se mudan al anfitrión.
// El checklist se queda fuera a propósito: es la plantilla base y el anfitrión ya
// tiene la suya, mudarla solo duplicaría renglones.
type MudableAProyecto = {
  updateMany: (args: {
    where: { proyectoId: string };
    data: { proyectoId: string };
  }) => Promise<unknown>;
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, clienteId: true, cotizacionId: true },
  });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  // Candidatas: cotizaciones aprobadas del mismo cliente que no estén ya en este proyecto.
  const candidatas = await prisma.cotizacion.findMany({
    where: {
      clienteId: proyecto.clienteId,
      estado: "APROBADA",
      id: { not: proyecto.cotizacionId },
      proyectoFusionadoId: null,
    },
    select: {
      id: true,
      numeroCotizacion: true,
      nombreEvento: true,
      fechaEvento: true,
      granTotal: true,
      proyecto: { select: { id: true, numeroProyecto: true } },
    },
    orderBy: { fechaEvento: "desc" },
    take: 50,
  });

  return NextResponse.json({ candidatas });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { cotizacionId } = await req.json().catch(() => ({ cotizacionId: null }));
  if (!cotizacionId) {
    return NextResponse.json({ error: "Falta cotizacionId" }, { status: 400 });
  }

  const [anfitrion, cot] = await Promise.all([
    prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, numeroProyecto: true, clienteId: true, cotizacionId: true },
    }),
    prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      select: {
        id: true,
        numeroCotizacion: true,
        clienteId: true,
        estado: true,
        proyectoFusionadoId: true,
        proyecto: { select: { id: true, numeroProyecto: true } },
      },
    }),
  ]);

  if (!anfitrion) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (!cot) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

  if (cot.clienteId !== anfitrion.clienteId) {
    return NextResponse.json(
      { error: "La cotización es de otro cliente" },
      { status: 400 },
    );
  }
  if (cot.id === anfitrion.cotizacionId) {
    return NextResponse.json(
      { error: "Esa cotización ya es el origen de este proyecto" },
      { status: 400 },
    );
  }
  if (cot.proyectoFusionadoId === anfitrion.id) {
    return NextResponse.json({ error: "La cotización ya está fusionada aquí" }, { status: 400 });
  }
  if (cot.estado !== "APROBADA") {
    return NextResponse.json(
      { error: "Solo se fusionan cotizaciones aprobadas" },
      { status: 400 },
    );
  }

  const absorbido = cot.proyecto && cot.proyecto.id !== anfitrion.id ? cot.proyecto : null;

  try {
    await prisma.$transaction(async (tx) => {
      if (absorbido) {
        const mudanzas: MudableAProyecto[] = [
          tx.proyectoEquipo,
          tx.proyectoPersonal,
          tx.proyectoBloqueTiempo,
          tx.proveedorEvento,
          tx.cuentaCobrar,
          tx.cuentaPagar,
          tx.movimientoFinanciero,
          tx.gastoOperativo,
          tx.ordenCompra,
          tx.proyectoArchivo,
          tx.proyectoBitacora,
          tx.fallaEquipo,
          tx.proyectoCarga,
        ];
        for (const tabla of mudanzas) {
          await tabla.updateMany({
            where: { proyectoId: absorbido.id },
            data: { proyectoId: anfitrion.id },
          });
        }
        // La cotización deja de ser origen para volverse invitada: el proyecto
        // viejo queda vacío y hay que borrarlo, porque cotizacionId es único.
        await tx.proyecto.delete({ where: { id: absorbido.id } });
      }

      await tx.cotizacion.update({
        where: { id: cot.id },
        data: { proyectoFusionadoId: anfitrion.id },
      });

      await tx.proyectoBitacora.create({
        data: {
          proyectoId: anfitrion.id,
          usuarioId: session.id,
          tipo: "ACCION",
          contenido: absorbido
            ? `Cotización ${cot.numeroCotizacion} fusionada a este proyecto por ${session.name ?? "sistema"}. Se absorbió el proyecto ${absorbido.numeroProyecto} (equipo, personal y cobranza mudados); la cotización se sigue facturando por separado.`
            : `Cotización ${cot.numeroCotizacion} fusionada a este proyecto por ${session.name ?? "sistema"}. Se factura por separado.`,
        },
      });
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[fusionar-cotizacion]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await sincronizarProyectoDesdeCotizacion(cot.id);

  return NextResponse.json({
    ok: true,
    proyectoId: anfitrion.id,
    absorbido: absorbido?.numeroProyecto ?? null,
  });
}
