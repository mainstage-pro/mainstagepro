import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ahora = new Date();

  const cxc = await prisma.cuentaCobrar.findMany({
    where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    include: {
      cliente: { select: { nombre: true } },
      proyecto: { select: { nombre: true, numeroProyecto: true } },
    },
    orderBy: { fechaCompromiso: "asc" },
  });

  // Buckets: corriente (no vencida), 0-30d, 31-60d, 60+d
  const buckets = {
    corriente: { items: [] as typeof cxc, total: 0 },
    d0_30:     { items: [] as typeof cxc, total: 0 },
    d31_60:    { items: [] as typeof cxc, total: 0 },
    d60mas:    { items: [] as typeof cxc, total: 0 },
  };

  for (const item of cxc) {
    const saldo = item.monto - (item.montoCobrado ?? 0);
    const diasVencido = Math.floor((ahora.getTime() - item.fechaCompromiso.getTime()) / 86400000);
    if (diasVencido <= 0) {
      buckets.corriente.items.push(item);
      buckets.corriente.total += saldo;
    } else if (diasVencido <= 30) {
      buckets.d0_30.items.push(item);
      buckets.d0_30.total += saldo;
    } else if (diasVencido <= 60) {
      buckets.d31_60.items.push(item);
      buckets.d31_60.total += saldo;
    } else {
      buckets.d60mas.items.push(item);
      buckets.d60mas.total += saldo;
    }
  }

  return NextResponse.json({ buckets, total: cxc.reduce((s, c) => s + c.monto - (c.montoCobrado ?? 0), 0) });
}
