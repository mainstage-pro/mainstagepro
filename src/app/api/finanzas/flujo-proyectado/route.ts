import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ahora = new Date();
  const en90dias = new Date(ahora.getTime() + 90 * 86400000);

  const [cxcItems, cxpItems] = await Promise.all([
    prisma.cuentaCobrar.findMany({
      where: {
        estado: { in: ["PENDIENTE", "PARCIAL"] },
        fechaCompromiso: { gte: ahora, lte: en90dias },
      },
      select: {
        id: true, concepto: true, monto: true, montoCobrado: true,
        fechaCompromiso: true, tipoPago: true,
        proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
        cliente: { select: { nombre: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
    }),
    prisma.cuentaPagar.findMany({
      where: {
        estado: { in: ["PENDIENTE", "PARCIAL"] },
        fechaCompromiso: { gte: ahora, lte: en90dias },
      },
      select: {
        id: true, concepto: true, monto: true, fechaCompromiso: true, tipoAcreedor: true,
        proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
    }),
  ]);

  // Agrupar por semana (periodos de 7 días desde hoy)
  function semanaIndex(fecha: Date) {
    const diff = fecha.getTime() - ahora.getTime();
    return Math.floor(diff / (7 * 86400000));
  }

  type Semana = {
    label: string;
    inicioISO: string;
    finISO: string;
    entradas: number;
    salidas: number;
    neto: number;
    cxc: typeof cxcItems;
    cxp: typeof cxpItems;
  };

  const semanas: Record<number, Semana> = {};

  for (const c of cxcItems) {
    const idx = semanaIndex(new Date(c.fechaCompromiso));
    if (!semanas[idx]) {
      const inicio = new Date(ahora.getTime() + idx * 7 * 86400000);
      const fin = new Date(inicio.getTime() + 6 * 86400000);
      semanas[idx] = {
        label: `${inicio.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${fin.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`,
        inicioISO: inicio.toISOString().slice(0, 10),
        finISO: fin.toISOString().slice(0, 10),
        entradas: 0, salidas: 0, neto: 0,
        cxc: [], cxp: [],
      };
    }
    const pendiente = c.monto - (c.montoCobrado ?? 0);
    semanas[idx].entradas += pendiente;
    semanas[idx].cxc.push(c);
  }

  for (const p of cxpItems) {
    const idx = semanaIndex(new Date(p.fechaCompromiso));
    if (!semanas[idx]) {
      const inicio = new Date(ahora.getTime() + idx * 7 * 86400000);
      const fin = new Date(inicio.getTime() + 6 * 86400000);
      semanas[idx] = {
        label: `${inicio.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${fin.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`,
        inicioISO: inicio.toISOString().slice(0, 10),
        finISO: fin.toISOString().slice(0, 10),
        entradas: 0, salidas: 0, neto: 0,
        cxc: [], cxp: [],
      };
    }
    semanas[idx].salidas += p.monto;
    semanas[idx].cxp.push(p);
  }

  const semanasList = Object.entries(semanas)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, s]) => ({ ...s, neto: s.entradas - s.salidas }));

  const totalEntradas = semanasList.reduce((s, w) => s + w.entradas, 0);
  const totalSalidas = semanasList.reduce((s, w) => s + w.salidas, 0);

  return NextResponse.json({ semanas: semanasList, totalEntradas, totalSalidas, totalNeto: totalEntradas - totalSalidas });
}
