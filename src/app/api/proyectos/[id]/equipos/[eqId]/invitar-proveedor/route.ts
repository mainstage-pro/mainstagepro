import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("52")) return digits;
  return "52" + digits;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; eqId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: proyectoId, eqId } = await params;

  const equipoItem = await prisma.proyectoEquipo.findUnique({
    where: { id: eqId },
    include: {
      equipo: {
        select: {
          descripcion: true,
          marca: true,
          categoria: { select: { nombre: true } },
        },
      },
      proveedor: { select: { nombre: true, telefono: true } },
      proyecto: { select: { nombre: true, fechaEvento: true, lugarEvento: true } },
    },
  });

  if (!equipoItem || equipoItem.proyectoId !== proyectoId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const token = crypto.randomUUID();

  await prisma.proyectoEquipo.update({
    where: { id: eqId },
    data: {
      confirmToken: token,
      confirmDisponible: null,
    },
  });

  const proyecto = equipoItem.proyecto;
  const equipo = equipoItem.equipo;
  const proveedor = equipoItem.proveedor;
  const fechaFormateada = proyecto?.fechaEvento
    ? new Date(proyecto.fechaEvento).toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "por confirmar";

  const confirmUrl = `https://mainstagepro.vercel.app/confirmar/proveedor/${token}`;

  let mensaje = `Hola ${proveedor?.nombre ?? ""},\n\n`;
  mensaje += `Queremos consultarte la disponibilidad del siguiente equipo:\n\n`;
  mensaje += `🔊 *Equipo:* ${equipo?.descripcion ?? "Sin descripción"}`;
  if (equipo?.marca) mensaje += ` (${equipo.marca})`;
  mensaje += `\n`;
  mensaje += `📦 *Cantidad:* ${equipoItem.cantidad} unidad${equipoItem.cantidad !== 1 ? "es" : ""}\n`;
  mensaje += `📆 *Días:* ${equipoItem.dias} día${equipoItem.dias !== 1 ? "s" : ""}\n\n`;
  mensaje += `Para el proyecto:\n`;
  mensaje += `📋 *Proyecto:* ${proyecto?.nombre ?? "Sin nombre"}\n`;
  mensaje += `📅 *Fecha:* ${fechaFormateada}\n`;
  mensaje += `📍 *Lugar:* ${proyecto?.lugarEvento ?? "Por confirmar"}\n\n`;
  mensaje += `Por favor confirma disponibilidad en el siguiente enlace:\n${confirmUrl}`;

  let whatsappUrl: string | null = null;
  if (proveedor?.telefono) {
    const phone = formatPhone(proveedor.telefono);
    whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
  }

  return NextResponse.json({ token, whatsappUrl, mensaje });
}
