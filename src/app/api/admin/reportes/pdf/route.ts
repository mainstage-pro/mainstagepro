import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF from "@react-pdf/renderer";
import React from "react";
import { AdminReportesPDF, AdminReportePDFData } from "@/components/AdminReportesPDF";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function fmtMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}

// GET /api/admin/reportes/pdf?mes=2026-06&tab=balance
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes  = req.nextUrl.searchParams.get("mes")  || new Date().toISOString().slice(0, 7);
  const tab  = (req.nextUrl.searchParams.get("tab") || "balance") as "balance" | "flujo" | "asistencias";

  const [year, month] = mes.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);

  const pdfData: AdminReportePDFData = {
    mes,
    mesLabel: fmtMes(mes),
    tab,
    generadoEn: new Date().toISOString(),
  };

  try {
    // ── BALANCE ─────────────────────────────────────────────────────────────
    if (tab === "balance") {
      const [cuentas, cxcAgg, activosDB, pasivosDB, sociosDB, movMes] = await Promise.all([
        prisma.cuentaBancaria.findMany({ select: { id: true, nombre: true, banco: true } }),
        prisma.cuentaCobrar.aggregate({
          where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
          _sum: { monto: true, montoCobrado: true },
        }),
        prisma.hervamActivo.groupBy({
          by: ["categoria"],
          where: { activo: true, categoria: { in: ["OFICINA", "INTANGIBLE", "OTRO"] } },
          _sum: { valorAdquisicion: true, valorActual: true },
          _count: { id: true },
        }),
        prisma.pasivoDeuda.findMany({
          where: { estado: "ACTIVO" },
          select: { nombre: true, categoria: true, montoTotal: true, montoPagado: true },
        }),
        prisma.socio.findMany({ select: { nombre: true, pctParticipacion: true, esRepresentante: true } }).catch(() => []),
        prisma.movimientoFinanciero.aggregate({
          where: { tipo: "INGRESO", fecha: { gte: start, lte: end } },
          _sum: { monto: true },
        }),
      ]);

      // Posición bancaria
      const cuentasPosicion = await Promise.all(cuentas.map(async c => {
        const [ing, gst] = await Promise.all([
          prisma.movimientoFinanciero.aggregate({ where: { cuentaDestinoId: c.id, tipo: "INGRESO" }, _sum: { monto: true } }),
          prisma.movimientoFinanciero.aggregate({ where: { cuentaOrigenId: c.id, tipo: { not: "INGRESO" } }, _sum: { monto: true } }),
        ]);
        return { nombre: c.nombre, banco: c.banco, posicion: (ing._sum.monto ?? 0) - (gst._sum.monto ?? 0) };
      }));

      const activosMapeados = activosDB.map(a => ({
        categoria: a.categoria,
        total: (a._sum.valorActual ?? 0) > 0 ? (a._sum.valorActual ?? 0) : (a._sum.valorAdquisicion ?? 0),
        count: a._count.id,
      }));

      const totalActivos =
        activosMapeados.reduce((s, a) => s + a.total, 0) +
        cuentasPosicion.reduce((s, c) => s + Math.max(c.posicion, 0), 0) +
        ((cxcAgg._sum.monto ?? 0) - (cxcAgg._sum.montoCobrado ?? 0));
      const totalPasivos = pasivosDB.reduce((s, p) => s + (p.montoTotal - p.montoPagado), 0);
      const patrimonioNeto = totalActivos - totalPasivos;
      const flujoMes = movMes._sum.monto ?? 0;
      const ratio = totalActivos > 0 ? patrimonioNeto / totalActivos : 0;
      const salud: "SALUDABLE" | "ATENCION" | "CRITICO" =
        patrimonioNeto > 0 && ratio > 0.1 ? "SALUDABLE" : patrimonioNeto > 0 ? "ATENCION" : "CRITICO";

      pdfData.balance = {
        totalActivos,
        totalPasivos,
        patrimonioNeto,
        flujoMes,
        salud,
        razonSocial: "Escenario Principal S.A. de C.V.",
        socios: sociosDB.map(s => ({ nombre: s.nombre, pctParticipacion: s.pctParticipacion })),
        activos: activosMapeados,
        pasivos: pasivosDB.map(p => ({ nombre: p.nombre, categoria: p.categoria, montoTotal: p.montoTotal, montoPagado: p.montoPagado })),
        cuentas: cuentasPosicion,
        cxc: (cxcAgg._sum.monto ?? 0) - (cxcAgg._sum.montoCobrado ?? 0),
      };
    }

    // ── FLUJO ────────────────────────────────────────────────────────────────
    if (tab === "flujo") {
      const [movIngr, movGsto, movRetr, cuotas, cuentas] = await Promise.all([
        prisma.movimientoFinanciero.findMany({
          where: { tipo: "INGRESO", fecha: { gte: start, lte: end } },
          include: { categoria: { select: { nombre: true } } },
        }),
        prisma.movimientoFinanciero.findMany({
          where: { tipo: "GASTO", fecha: { gte: start, lte: end } },
          include: { categoria: { select: { nombre: true } } },
        }),
        prisma.movimientoFinanciero.findMany({
          where: { tipo: "RETIRO", fecha: { gte: start, lte: end } },
          _sum: { monto: true },
        } as Parameters<typeof prisma.movimientoFinanciero.findMany>[0]),
        prisma.cuotaDeuda.findMany({ where: { estado: "PAGADO", updatedAt: { gte: start, lte: end } }, select: { monto: true } }).catch(() => []),
        prisma.cuentaBancaria.findMany({ select: { id: true, nombre: true, banco: true } }),
      ]);

      const entradas = movIngr.reduce((s, m) => s + m.monto, 0);
      const salidas  = movGsto.reduce((s, m) => s + m.monto, 0);
      const compromisos = cuotas.reduce((s, c) => s + c.monto, 0);
      const retiros  = (movRetr as { monto: number }[]).reduce((s, m) => s + m.monto, 0);
      const flujoNeto = entradas - salidas - compromisos - retiros;

      // Agrupados por categoría
      const entradaMap: Record<string, number> = {};
      for (const m of movIngr) {
        const cat = m.categoria?.nombre ?? "Sin categoría";
        entradaMap[cat] = (entradaMap[cat] ?? 0) + m.monto;
      }
      const salidaMap: Record<string, number> = {};
      for (const m of movGsto) {
        const cat = m.categoria?.nombre ?? "Sin categoría";
        salidaMap[cat] = (salidaMap[cat] ?? 0) + m.monto;
      }

      // Posición bancaria
      const cuentasPosicion = await Promise.all(cuentas.map(async c => {
        const [ing, gst] = await Promise.all([
          prisma.movimientoFinanciero.aggregate({ where: { cuentaDestinoId: c.id, tipo: "INGRESO", fecha: { gte: start, lte: end } }, _sum: { monto: true } }),
          prisma.movimientoFinanciero.aggregate({ where: { cuentaOrigenId: c.id, tipo: { not: "INGRESO" }, fecha: { gte: start, lte: end } }, _sum: { monto: true } }),
        ]);
        return { nombre: c.nombre, banco: c.banco, posicion: (ing._sum.monto ?? 0) - (gst._sum.monto ?? 0) };
      }));

      const totalSalidas = salidas + compromisos + retiros;
      pdfData.flujo = {
        entradas,
        salidas,
        compromisos,
        flujoNeto,
        pctOperativo: totalSalidas > 0 ? (salidas / totalSalidas) * 100 : 0,
        pctEstructural: totalSalidas > 0 ? ((compromisos + retiros) / totalSalidas) * 100 : 0,
        entradasPorCategoria: Object.entries(entradaMap).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total),
        salidasPorCategoria: Object.entries(salidaMap).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total),
        cuentas: cuentasPosicion,
      };
    }

    // ── ASISTENCIAS ──────────────────────────────────────────────────────────
    if (tab === "asistencias") {
      const diasHabiles: string[] = [];
      const cursor = new Date(year, month - 1, 1);
      while (cursor.getMonth() === month - 1) {
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) diasHabiles.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }

      const personal = await prisma.personalInterno.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, departamento: true },
        orderBy: { nombre: "asc" },
      });

      const asistencias = await prisma.asistencia.findMany({
        where: { fecha: { gte: start, lte: end }, personalId: { in: personal.map(p => p.id) } },
        select: { personalId: true, fecha: true, estado: true },
      });

      const mapaAsist: Record<string, Record<string, string>> = {};
      for (const a of asistencias) {
        if (!mapaAsist[a.personalId]) mapaAsist[a.personalId] = {};
        mapaAsist[a.personalId][new Date(a.fecha).toISOString().slice(0, 10)] = a.estado;
      }

      let totalPresentes = 0, totalRetardosFaltas = 0;
      const resumenPersonal = personal.map(p => {
        const regs = mapaAsist[p.id] ?? {};
        let presentes = 0, retardos = 0, faltas = 0;
        for (const dia of diasHabiles) {
          const est = regs[dia];
          if (est === "PRESENTE") presentes++;
          else if (est === "RETARDO") { presentes++; retardos++; }
          else if (est === "FALTA") faltas++;
          else faltas++;
        }
        totalPresentes += presentes;
        totalRetardosFaltas += retardos + faltas;
        const pct = diasHabiles.length > 0 ? (presentes / diasHabiles.length) * 100 : 0;
        return { nombre: p.nombre, departamento: p.departamento ?? "—", presentes, retardos, faltas, pct };
      });

      const pctGeneral = resumenPersonal.length > 0
        ? resumenPersonal.reduce((s, p) => s + p.pct, 0) / resumenPersonal.length
        : 0;

      pdfData.asistencias = {
        diasHabiles: diasHabiles.length,
        pctGeneral,
        totalPresentes,
        retardosFaltas: totalRetardosFaltas,
        personal: resumenPersonal,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfStream = await ReactPDF.renderToStream(React.createElement(AdminReportesPDF, { data: pdfData }) as any);
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Reporte-Admin-${tab}-${mes}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("Error generating admin PDF:", err);
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }
}
