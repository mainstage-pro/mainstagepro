import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createExpiringToken } from "@/lib/tokens";
import { getConfig } from "@/lib/config";
import { logActividad } from "@/lib/actividad";

// POST: genera (o devuelve) el link público del brief de descubrimiento.
// Mismo esquema que la propuesta/cotización: token con expiración embebida.
// Reusar el existente evita invalidar un link ya enviado al cliente.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyectoCreativo.findUnique({
    where: { id },
    select: { id: true, numero: true, formToken: true },
  });
  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const token = proyecto.formToken ?? createExpiringToken(90);

  if (!proyecto.formToken) {
    await prisma.proyectoCreativo.update({ where: { id }, data: { formToken: token, formEstado: "PENDIENTE" } });
    await logActividad(
      session.id,
      "EDITAR",
      "proyecto_creativo",
      id,
      `Link de brief generado para proyecto creativo ${proyecto.numero}`,
    );
  }

  const appUrl = await getConfig("empresa.appUrl", process.env.NEXTAUTH_URL ?? "https://mainstagepro.vercel.app");
  return NextResponse.json({ token, url: `${appUrl}/brief-creativo/${token}` });
}

// DELETE: revoca el link. El cliente deja de poder llenar el brief con él.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyectoCreativo.findUnique({
    where: { id },
    select: { numero: true, formToken: true },
  });
  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!proyecto.formToken) return NextResponse.json({ ok: true });

  await prisma.proyectoCreativo.update({ where: { id }, data: { formToken: null } });
  await logActividad(session.id, "EDITAR", "proyecto_creativo", id, `Link de brief revocado de ${proyecto.numero}`);

  return NextResponse.json({ ok: true });
}
