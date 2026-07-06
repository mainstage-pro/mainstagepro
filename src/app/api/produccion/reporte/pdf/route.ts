import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF from "@react-pdf/renderer";
import { ReporteProduccionPDF, ReporteProduccionPDFData } from "@/components/ReporteProduccionPDF";
import React from "react";
import fs from "fs";
import path from "path";

type SeccionTipo = "checklist" | "equipos" | "inventario" | "vehiculos" | "proyectos";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function getMesLabel(mes: string) {
  const [y, m] = mes.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

function getMesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url     = new URL(request.url);
  const mes     = url.searchParams.get("mes") ?? getMesActual();
  const seccion = (url.searchParams.get("seccion") ?? "checklist") as SeccionTipo;

  const [year, month] = mes.split("-").map(Number);
  if (!year || !month) return NextResponse.json({ error: "Mes inválido" }, { status: 400 });

  const inicio   = new Date(year, month - 1, 1);
  const fin      = new Date(year, month, 0, 23, 59, 59, 999);
  const mesLabel = getMesLabel(mes);

  // Logo en base64
  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc  = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const pdfData: ReporteProduccionPDFData = { mes, mesLabel, seccion, logoSrc };

  // Helper para leer notas del query string
  function nota(key: string) { return url.searchParams.get(key) ?? undefined; }

  // ── CHECKLIST ──────────────────────────────────────────────────────────────
  if (seccion === "checklist") {
    const checklists = await prisma.checklistBodega.findMany({
      where: { fechaInicio: { gte: inicio, lte: fin } },
      include: {
        items: { include: { equipo: { select: { id: true, descripcion: true, marca: true } } } },
      },
      orderBy: { fechaInicio: "asc" },
    });

    pdfData.checklist = {
      kpis: {
        semanasTotales:     checklists.length,
        semanasCompletadas: checklists.filter(c => c.estado === "COMPLETADO").length,
        semanasConAlertas:  checklists.filter(c => c.items.some(i => i.estado !== "EN_BODEGA")).length,
      },
      checklists: checklists.map(c => {
        const alertas = c.items.filter(i => i.estado !== "EN_BODEGA" && i.estado !== "EN_RENTA_O_USO");
        const ok      = c.items.filter(i => i.estado === "EN_BODEGA").length;
        const total   = c.items.length;
        return {
          semana:  c.semana,
          estado:  c.estado,
          notas:   c.notas,
          stats: {
            total,
            enBodega:   ok,
            enRenta:    c.items.filter(i => i.estado === "EN_RENTA_O_USO").length,
            cumplimiento: total === 0 ? 100 : Math.round((ok / total) * 100),
            extraviados:  c.items.filter(i => i.estado === "EXTRAVIADO").length,
            perdidos:     c.items.filter(i => i.estado === "PERDIDO").length,
          },
          alertas: alertas.map(a => ({
            descripcion: a.descripcion,
            estado: a.estado,
            equipo: a.equipo ? { descripcion: a.equipo.descripcion, marca: a.equipo.marca } : null,
          })),
        };
      }),
      analisis:    nota("rp-checklist-analisis"),
      propuesta:   nota("rp-checklist-propuesta"),
      comentarios: nota("rp-checklist-comentarios"),
    };
  }

  // ── MANTENIMIENTO ──────────────────────────────────────────────────────────
  else if (seccion === "equipos") {
    const revisiones = await prisma.mantenimientoEquipo.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { equipo: { include: { categoria: true } } },
      orderBy: { fecha: "desc" },
    });

    const porEquipo = new Map<string, typeof revisiones>();
    for (const r of revisiones) {
      const arr = porEquipo.get(r.equipoId) ?? [];
      arr.push(r);
      porEquipo.set(r.equipoId, arr);
    }

    const equiposPorEquipo = Array.from(porEquipo.entries()).map(([, revs]) => {
      const eq = revs[0].equipo;
      return {
        equipo: { descripcion: eq.descripcion, marca: eq.marca, categoria: eq.categoria },
        revisiones: revs.map(r => ({
          fecha:            r.fecha.toISOString(),
          tipo:             r.tipo,
          accionRealizada:  r.accionRealizada,
          costoReparacion:  r.costoReparacion,
          comentarios:      r.comentarios,
        })),
        costoTotal:    revs.reduce((a, r) => a + (r.costoReparacion ?? 0), 0),
        tuvoBajaFalla: revs.some(r => r.estadoEquipo === "DADO_DE_BAJA"),
      };
    });

    pdfData.equipos = {
      kpis: {
        totalRevisiones:          revisiones.length,
        equiposRevisados:         porEquipo.size,
        equiposConFalla:          equiposPorEquipo.filter(e => e.tuvoBajaFalla).length,
        equiposEnMantenimiento:   0,
        totalCostoReparaciones:   revisiones.reduce((a, r) => a + (r.costoReparacion ?? 0), 0),
      },
      equiposPorEquipo,
      analisis:    nota("rp-mant-analisis"),
      propuesta:   nota("rp-mant-propuesta"),
      comentarios: nota("rp-mant-comentarios"),
    };
  }

  // ── INVENTARIO ─────────────────────────────────────────────────────────────
  else if (seccion === "inventario") {
    const [altas, bajas, todos] = await Promise.all([
      prisma.equipo.findMany({ where: { createdAt: { gte: inicio, lte: fin } }, include: { categoria: true }, orderBy: { createdAt: "asc" } }),
      prisma.equipo.findMany({ where: { fechaBaja: { gte: inicio, lte: fin } }, include: { categoria: true }, orderBy: { fechaBaja: "asc" } }),
      prisma.equipo.findMany({ select: { estado: true } }),
    ]);

    const estadoActual: Record<string, number> = {};
    for (const e of todos) estadoActual[e.estado] = (estadoActual[e.estado] ?? 0) + 1;

    pdfData.inventario = {
      kpis: { altas: altas.length, bajas: bajas.length, delta: altas.length - bajas.length },
      altas: altas.map(e => ({ descripcion: e.descripcion, marca: e.marca, tipo: e.tipo, categoria: e.categoria, createdAt: e.createdAt.toISOString() })),
      bajas: bajas.map(e => ({ descripcion: e.descripcion, marca: e.marca, tipo: e.tipo, categoria: e.categoria, fechaBaja: e.fechaBaja?.toISOString() ?? null })),
      estadoActual,
      analisis:    nota("rp-inv-analisis"),
      propuesta:   nota("rp-inv-propuesta"),
      comentarios: nota("rp-inv-comentarios"),
    };
  }

  // ── VEHÍCULOS ──────────────────────────────────────────────────────────────
  else if (seccion === "vehiculos") {
    const registros = await prisma.mantenimientoVehiculo.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { vehiculo: true },
      orderBy: { fecha: "desc" },
    });

    const porVehiculo = new Map<string, typeof registros>();
    for (const r of registros) {
      const arr = porVehiculo.get(r.vehiculoId) ?? [];
      arr.push(r);
      porVehiculo.set(r.vehiculoId, arr);
    }

    const vehiculosList = Array.from(porVehiculo.entries()).map(([, regs]) => ({
      vehiculo: {
        nombre: regs[0].vehiculo.nombre,
        marca:  regs[0].vehiculo.marca,
        modelo: regs[0].vehiculo.modelo,
        placas: regs[0].vehiculo.placas,
      },
      registros: regs.map(r => ({
        fecha:       r.fecha.toISOString(),
        tipoRegistro: r.tipoRegistro,
        servicio:    r.servicio,
        costo:       r.costo,
        km:          r.km,
        prioridad:   r.prioridad,
        estatus:     r.estatus,
      })),
      costoTotal: regs.reduce((a, r) => a + (r.costo ?? 0), 0),
    }));

    pdfData.vehiculos = {
      totalRegistros: registros.length,
      totalCosto:     registros.reduce((a, r) => a + (r.costo ?? 0), 0),
      vehiculos:      vehiculosList,
      analisis:    nota("rp-veh-analisis"),
      propuesta:   nota("rp-veh-propuesta"),
      comentarios: nota("rp-veh-comentarios"),
    };
  }

  // ── PROYECTOS ──────────────────────────────────────────────────────────────
  else if (seccion === "proyectos") {
    const proyectos = await prisma.proyecto.findMany({
      where: { fechaEvento: { gte: inicio, lte: fin } },
      include: {
        encargado:         { select: { name: true } },
        cierreFinanciero:  true,
        evaluacionInterna: true,
        checklist:         { select: { completado: true } },
      },
      orderBy: { fechaEvento: "asc" },
    });

    const lista = proyectos.map(p => {
      const total       = p.checklist.length;
      const completados = p.checklist.filter((i: { completado: boolean }) => i.completado).length;
      const avance      = total === 0 ? 0 : Math.round((completados / total) * 100);
      return {
        id:             p.id,
        numeroProyecto: p.numeroProyecto,
        nombre:         p.nombre,
        estado:         p.estado,
        tipoEvento:     p.tipoEvento,
        fechaEvento:    p.fechaEvento.toISOString(),
        avance,
        zona:           p.zona,
        encargado:      p.encargado,
        checklist: { total, completados, porcentaje: avance },
        cierreFinanciero:  p.cierreFinanciero,
        evaluacionInterna: p.evaluacionInterna,
      };
    });

    const califs = lista
      .map(p => p.evaluacionInterna?.promedioCalculado ?? null)
      .filter((v): v is number => v !== null);

    pdfData.proyectos = {
      kpis: {
        total:               lista.length,
        renta:               lista.filter(p => p.tipoEvento === "RENTA").length,
        produccion:          lista.filter(p => p.tipoEvento !== "RENTA").length,
        completados:         lista.filter(p => p.estado === "COMPLETADO").length,
        promedioAvance:      lista.length === 0 ? 0 : Math.round(lista.reduce((a, p) => a + p.avance, 0) / lista.length),
        promedioCalificacion: califs.length === 0 ? null : parseFloat((califs.reduce((a, v) => a + v, 0) / califs.length).toFixed(1)),
      },
      lista,
      analisis:    nota("rp-proy-analisis"),
      propuesta:   nota("rp-proy-propuesta"),
      comentarios: nota("rp-proy-comentarios"),
    };
  }

  // ── Generar PDF ────────────────────────────────────────────────────────────
  const element   = React.createElement(ReporteProduccionPDF, { data: pdfData });
  const pdfBuffer = await ReactPDF.renderToBuffer(element as Parameters<typeof ReactPDF.renderToBuffer>[0]);
  const buf = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

  const seccionLabel: Record<SeccionTipo, string> = {
    checklist:  "Checklist-Semanal",
    equipos:    "Mantenimiento",
    inventario: "Inventario",
    vehiculos:  "Vehiculos",
    proyectos:  "Proyectos",
  };

  const filename = `Reporte-Produccion-${seccionLabel[seccion]}-${mes}.pdf`;

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
