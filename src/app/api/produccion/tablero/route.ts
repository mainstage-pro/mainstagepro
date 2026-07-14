import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Tablero operativo de Producción: equipos en taller (mantenimiento/reparación)
// + equipos de renta que siguen fuera (pendientes de recolección).

const ESTADOS_TALLER = ["EN_MANTENIMIENTO", "EN_REPARACION"];

function diasDesde(fecha: Date | null): number | null {
  if (!fecha) return null;
  const ms = Date.now() - new Date(fecha).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const [unidades, equiposGenerales, proyectos] = await Promise.all([
      // Unidades individuales en taller
      prisma.equipoUnidad.findMany({
        where: { estado: { in: ESTADOS_TALLER } },
        select: {
          id: true,
          codigo: true,
          notas: true,
          estado: true,
          equipo: {
            select: {
              id: true,
              descripcion: true,
              marca: true,
              categoria: { select: { nombre: true } },
            },
          },
          mantenimientos: {
            orderBy: { fecha: "desc" },
            take: 1,
            select: { fecha: true, tipo: true, accionRealizada: true, costoReparacion: true },
          },
        },
      }),
      // Equipos marcados en taller a nivel general (sin unidad específica)
      prisma.equipo.findMany({
        where: { estado: { in: ESTADOS_TALLER }, activo: true },
        select: {
          id: true,
          descripcion: true,
          marca: true,
          estado: true,
          categoria: { select: { nombre: true } },
          mantenimientos: {
            where: { unidadId: null },
            orderBy: { fecha: "desc" },
            take: 1,
            select: { fecha: true, tipo: true, accionRealizada: true, costoReparacion: true },
          },
        },
      }),
      // Proyectos de renta con equipo aún fuera
      prisma.proyecto.findMany({
        where: { recoleccionStatus: { in: ["PENDIENTE", "EN_CAMINO"] } },
        select: {
          id: true,
          numeroProyecto: true,
          nombre: true,
          fechaEvento: true,
          logisticaRenta: true,
          recoleccionStatus: true,
          choferNombre: true,
          choferExterno: true,
          cliente: { select: { nombre: true, empresa: true, telefono: true } },
          equipos: { select: { cantidad: true } },
          trato: { select: { ideasReferencias: true } },
        },
        orderBy: { fechaEvento: "asc" },
      }),
    ]);

    const enTaller = [
      ...unidades.map((u) => {
        const m = u.mantenimientos[0] ?? null;
        return {
          tipoRegistro: "unidad" as const,
          equipoId: u.equipo.id,
          unidadId: u.id,
          descripcion: u.equipo.descripcion,
          marca: u.equipo.marca,
          categoria: u.equipo.categoria?.nombre ?? null,
          codigo: u.codigo,
          notas: u.notas,
          tipo: m?.tipo ?? null,
          esReparacion: u.estado === "EN_REPARACION",
          desde: m?.fecha ?? null,
          dias: diasDesde(m?.fecha ?? null),
          accion: m?.accionRealizada ?? null,
          costo: m?.costoReparacion ?? null,
        };
      }),
      ...equiposGenerales.map((e) => {
        const m = e.mantenimientos[0] ?? null;
        return {
          tipoRegistro: "equipo" as const,
          equipoId: e.id,
          unidadId: null,
          descripcion: e.descripcion,
          marca: e.marca,
          categoria: e.categoria?.nombre ?? null,
          codigo: null,
          notas: null,
          tipo: m?.tipo ?? null,
          esReparacion: e.estado === "EN_REPARACION",
          desde: m?.fecha ?? null,
          dias: diasDesde(m?.fecha ?? null),
          accion: m?.accionRealizada ?? null,
          costo: m?.costoReparacion ?? null,
        };
      }),
    ].sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1));

    const hoy = new Date().toISOString().split("T")[0];
    const fuera = proyectos.map((p) => {
      let fechaDevolucion: string | null = null;
      try {
        const src = p.logisticaRenta || p.trato?.ideasReferencias;
        if (src) fechaDevolucion = JSON.parse(src).fechaDevolucion ?? null;
      } catch { /* ignore */ }
      const diasAtraso = fechaDevolucion && fechaDevolucion < hoy
        ? diasDesde(new Date(fechaDevolucion + "T12:00:00"))
        : 0;
      return {
        id: p.id,
        numeroProyecto: p.numeroProyecto,
        nombre: p.nombre,
        recoleccionStatus: p.recoleccionStatus,
        cliente: p.cliente?.nombre ?? null,
        empresa: p.cliente?.empresa ?? null,
        telefono: p.cliente?.telefono ?? null,
        chofer: p.choferNombre,
        choferExterno: p.choferExterno,
        fechaDevolucion,
        vencida: !!fechaDevolucion && fechaDevolucion < hoy,
        diasAtraso: diasAtraso ?? 0,
        equiposCount: p.equipos.reduce((s, e) => s + (e.cantidad ?? 0), 0),
      };
    }).sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0));

    return NextResponse.json({
      enTaller,
      fuera,
      resumen: {
        enReparacion: enTaller.filter((x) => x.esReparacion).length,
        enMantenimiento: enTaller.filter((x) => !x.esReparacion).length,
        equiposFuera: fuera.length,
        recoleccionesVencidas: fuera.filter((x) => x.vencida).length,
        costoTaller: enTaller.reduce((s, x) => s + (x.costo ?? 0), 0),
      },
    });
  } catch (e) {
    console.error("[/api/produccion/tablero]", e);
    return NextResponse.json({ error: String(e), enTaller: [], fuera: [] }, { status: 500 });
  }
}
