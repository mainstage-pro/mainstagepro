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
  { params }: { params: Promise<{ id: string; pId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: proyectoId, pId } = await params;

  const personal = await prisma.proyectoPersonal.findUnique({
    where: { id: pId },
    include: {
      tecnico: { select: { nombre: true, celular: true } },
      rolTecnico: { select: { nombre: true } },
      proyecto: { select: { nombre: true, fechaEvento: true, lugarEvento: true } },
    },
  });

  if (!personal || personal.proyectoId !== proyectoId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const token = crypto.randomUUID();

  await prisma.proyectoPersonal.update({
    where: { id: pId },
    data: {
      confirmToken: token,
      confirmado: false,
      confirmRespuesta: null,
    },
  });

  const proyecto = personal.proyecto;
  const tecnico = personal.tecnico;
  const rolNombre = personal.rolTecnico?.nombre ?? "Técnico";
  const fechaFormateada = proyecto?.fechaEvento
    ? new Date(proyecto.fechaEvento).toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "por confirmar";

  const confirmUrl = `https://mainstagepro.vercel.app/confirmar/tecnico/${token}`;

  let mensaje = `Hola ${tecnico?.nombre ?? ""},\n\n`;
  mensaje += `Te invitamos a participar en el siguiente proyecto:\n\n`;
  mensaje += `📋 *Proyecto:* ${proyecto?.nombre ?? "Sin nombre"}\n`;
  mensaje += `📅 *Fecha:* ${fechaFormateada}\n`;
  mensaje += `📍 *Lugar:* ${proyecto?.lugarEvento ?? "Por confirmar"}\n`;
  mensaje += `🎛️ *Rol:* ${rolNombre}\n`;
  if (personal.jornada) mensaje += `⏱️ *Jornada:* ${personal.jornada}\n`;
  if (personal.tarifaAcordada) {
    mensaje += `💰 *Tarifa:* $${personal.tarifaAcordada.toLocaleString("es-MX")} MXN\n`;
  }
  mensaje += `\nPor favor confirma tu participación en el siguiente enlace:\n${confirmUrl}`;

  let whatsappUrl: string | null = null;
  if (tecnico?.celular) {
    const phone = formatPhone(tecnico.celular);
    whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
  }

  return NextResponse.json({ token, whatsappUrl, mensaje });
}
