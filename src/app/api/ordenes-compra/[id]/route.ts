import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ["estado", "fechaEntrega", "notas", "monto", "montoIva", "descripcion", "lineas"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (key === "fechaEntrega" && body[key]) data[key] = new Date(body[key]);
      else if (key === "monto" || key === "montoIva") data[key] = parseFloat(body[key]);
      else if (key === "lineas") data[key] = body[key] ? JSON.stringify(body[key]) : null;
      else data[key] = body[key];
    }
  }
  // Recalcular total
  if ("monto" in data || "montoIva" in data) {
    const current = await prisma.ordenCompra.findUnique({ where: { id }, select: { monto: true, montoIva: true } });
    const m = (data.monto as number | undefined) ?? current?.monto ?? 0;
    const iva = (data.montoIva as number | undefined) ?? current?.montoIva ?? 0;
    data.total = m + iva;
  }

  const orden = await prisma.ordenCompra.update({
    where: { id },
    data,
    include: {
      proveedor: { select: { id: true, nombre: true, empresa: true, telefono: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
    },
  });

  return NextResponse.json({ orden });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.ordenCompra.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
