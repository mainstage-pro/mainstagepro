import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── Tipos de clasificación ─────────────────────────────────────────────────
export type ClasifEquipo =
  | "PROPIO_INVENTARIO"   // En nuestro inventario, disponibilidad verificada
  | "PROPIO_MANUAL"       // Marcado como propio pero sin vínculo al inventario
  | "EXTERNO_INVENTARIO"  // En inventario externo/renta catalogado
  | "EXTERNO_ASIGNADO"    // Ya lo trae un proveedor del evento
  | "A_CONSEGUIR";        // Sin proveedor todavía

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      numeroProyecto: true,
      fechaEvento: true,
      fechaMontaje: true,
      cotizacionId: true,
      cotizacion: {
        select: {
          id: true,
          lineas: {
            where: { tipo: { in: ["EQUIPO_PROPIO", "EQUIPO_EXTERNO"] } },
            select: {
              id: true,
              tipo: true,
              orden: true,
              descripcion: true,
              marca: true,
              modelo: true,
              cantidad: true,
              dias: true,
              precioUnitario: true,
              costoUnitario: true,
              costoExterno: true,
              proveedorId: true,
              proveedorRentaId: true,
              notasInternas: true,
              proveedorEventoId: true,
              equipoId: true,
              equipo: {
                select: { id: true, descripcion: true, cantidadTotal: true, tipo: true },
              },
              proveedor: { select: { id: true, nombre: true, empresa: true } },
              proveedorRenta: { select: { id: true, nombre: true, empresa: true } },
            },
            orderBy: { orden: "asc" },
          },
        },
      },
      equipos: {
        include: {
          equipo: { select: { id: true, descripcion: true, marca: true, modelo: true, cantidadTotal: true } },
          proveedor: { select: { id: true, nombre: true, empresa: true } },
        },
      },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (!proyecto.cotizacion) return NextResponse.json({ lineas: [], proveedores: [] });

  // ── Rango de fechas del evento ─────────────────────────────────────────────
  const fechaInicio = proyecto.fechaMontaje ?? proyecto.fechaEvento;
  const fechaFin = new Date(proyecto.fechaEvento);
  fechaFin.setHours(23, 59, 59, 999);

  // ── IDs de equipos propios vinculados al inventario ────────────────────────
  const propioEquipoIds = proyecto.cotizacion.lineas
    .filter((l) => l.tipo === "EQUIPO_PROPIO" && l.equipoId && l.equipo?.tipo === "PROPIO")
    .map((l) => l.equipoId!);

  // ── Conflictos en otras cotizaciones ──────────────────────────────────────
  const cotConflicto = propioEquipoIds.length > 0
    ? await prisma.cotizacion.findMany({
        where: {
          id: { not: proyecto.cotizacion.id },
          estado: "APROBADA",
          proyecto: { is: null },
          OR: [
            { fechaEvento: { gte: fechaInicio, lte: fechaFin } },
            { trato: { fechaEventoEstimada: { gte: fechaInicio, lte: fechaFin } } },
          ],
          lineas: { some: { equipoId: { in: propioEquipoIds }, tipo: "EQUIPO_PROPIO" } },
        },
        select: {
          numeroCotizacion: true,
          nombreEvento: true,
          estado: true,
          fechaEvento: true,
          lineas: {
            where: { equipoId: { in: propioEquipoIds }, tipo: "EQUIPO_PROPIO" },
            select: { equipoId: true, cantidad: true },
          },
        },
      })
    : [];

  // ── Conflictos en otros proyectos ─────────────────────────────────────────
  const proyConflicto = propioEquipoIds.length > 0
    ? await prisma.proyecto.findMany({
        where: {
          id: { not: id },
          estado: { notIn: ["CANCELADO", "COMPLETADO"] },
          OR: [
            { fechaEvento: { gte: fechaInicio, lte: fechaFin } },
            { fechaMontaje: { gte: fechaInicio, lte: fechaFin } },
          ],
          // Un equipo que ya se quitó de su cotización no sigue apartando inventario.
          equipos: { some: { equipoId: { in: propioEquipoIds }, tipo: "PROPIO", necesitaRevision: false } },
        },
        select: {
          numeroProyecto: true,
          nombre: true,
          estado: true,
          fechaEvento: true,
          equipos: {
            where: { equipoId: { in: propioEquipoIds }, tipo: "PROPIO", necesitaRevision: false },
            select: { equipoId: true, cantidad: true },
          },
        },
      })
    : [];

  // ── Mapa de comprometido por equipoId ─────────────────────────────────────
  const comprometidoMap: Record<string, { cantidad: number; refs: Array<{ ref: string; nombre: string; estado: string; fecha: string | null }> }> = {};

  for (const cot of cotConflicto) {
    for (const l of cot.lineas) {
      if (!l.equipoId) continue;
      if (!comprometidoMap[l.equipoId]) comprometidoMap[l.equipoId] = { cantidad: 0, refs: [] };
      comprometidoMap[l.equipoId].cantidad += l.cantidad;
      comprometidoMap[l.equipoId].refs.push({
        ref: cot.numeroCotizacion,
        nombre: cot.nombreEvento ?? "Sin nombre",
        estado: cot.estado,
        fecha: cot.fechaEvento ? cot.fechaEvento.toISOString().split("T")[0] : null,
      });
    }
  }
  for (const proy of proyConflicto) {
    for (const e of proy.equipos) {
      if (!e.equipoId) continue;
      if (!comprometidoMap[e.equipoId]) comprometidoMap[e.equipoId] = { cantidad: 0, refs: [] };
      comprometidoMap[e.equipoId].cantidad += e.cantidad;
      comprometidoMap[e.equipoId].refs.push({
        ref: proy.numeroProyecto,
        nombre: proy.nombre,
        estado: proy.estado,
        fecha: proy.fechaEvento ? proy.fechaEvento.toISOString().split("T")[0] : null,
      });
    }
  }

  // Una misma cotización/proyecto puede tener varias líneas del mismo equipo
  // (p. ej. dos renglones separados de la misma pantalla): deduplicar por ref
  // para no listar la misma referencia varias veces en "comprometido en".
  for (const info of Object.values(comprometidoMap)) {
    const vistos = new Set<string>();
    info.refs = info.refs.filter((r) => {
      if (vistos.has(r.ref)) return false;
      vistos.add(r.ref);
      return true;
    });
  }

  // ── Clasificar cada línea ──────────────────────────────────────────────────
  const lineasClasificadas = proyecto.cotizacion.lineas.map((linea) => {
    let clasificacion: ClasifEquipo;
    let disponible = 0;
    let comprometido = 0;
    let conflictos: Array<{ ref: string; nombre: string; estado: string; fecha: string | null }> = [];

    if (linea.tipo === "EQUIPO_PROPIO") {
      if (linea.equipoId && linea.equipo) {
        if (linea.equipo.tipo === "PROPIO") {
          // Propio con vínculo al inventario → verificar disponibilidad
          const info = comprometidoMap[linea.equipoId];
          comprometido = info?.cantidad ?? 0;
          disponible = linea.equipo.cantidadTotal - comprometido;
          conflictos = info?.refs ?? [];
          clasificacion = disponible >= linea.cantidad ? "PROPIO_INVENTARIO" : "PROPIO_INVENTARIO"; // conflicto se señala aparte
        } else {
          // Equipo en inventario pero de tipo EXTERNO → proveedor externo catalogado
          clasificacion = "EXTERNO_INVENTARIO";
        }
      } else {
        // Propio manual (sin vínculo al inventario)
        clasificacion = "PROPIO_MANUAL";
      }
    } else {
      // EQUIPO_EXTERNO — queda resuelto cuando un proveedor del evento se hace cargo.
      clasificacion = linea.proveedorEventoId ? "EXTERNO_ASIGNADO" : "A_CONSEGUIR";
    }

    const allowedNames = ["mauricio", "emiliano", "carlos"];
    const canViewFinances = allowedNames.some(name => session.name.toLowerCase().includes(name));

    return {
      id: linea.id,
      tipo: linea.tipo,
      orden: linea.orden,
      descripcion: linea.descripcion,
      marca: linea.marca,
      modelo: linea.modelo,
      cantidad: linea.cantidad,
      dias: linea.dias,
      precioUnitario: canViewFinances ? linea.precioUnitario : 0,
      costoExterno: canViewFinances ? linea.costoExterno : null,
      // Lo que el cotizador estimó que nos cobra el proveedor, por unidad y día.
      costoUnitario: canViewFinances ? linea.costoUnitario : null,
      equipoId: linea.equipoId,
      equipoInventarioTipo: linea.equipo?.tipo ?? null,
      cantidadTotal: linea.equipo?.cantidadTotal ?? null,
      proveedorId: linea.proveedorId ?? linea.proveedorRentaId,
      proveedor: linea.proveedor ?? linea.proveedorRenta,
      proveedorEventoId: linea.proveedorEventoId,
      clasificacion,
      disponible,
      comprometido,
      conflictos,
    };
  });

  // ── Proveedores activos ────────────────────────────────────────────────────
  const proveedores = await prisma.proveedor.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, empresa: true },
    orderBy: { nombre: "asc" },
  });

  // Bloques de proveedor de este evento, para asignarles conceptos desde aquí.
  const proveedoresEvento = await prisma.proveedorEvento.findMany({
    where: { proyectoId: id },
    select: { id: true, nombreProveedor: true, servicioEquipo: true },
    orderBy: { createdAt: "asc" },
  });

  // El equipo de tercero se captura en el rider del proyecto. Se expone aquí para
  // que la pestaña de operación lo lea sin volver a preguntarlo.
  const verCostos = ["mauricio", "emiliano", "carlos"].some((n) =>
    session.name.toLowerCase().includes(n),
  ) && _req.nextUrl.searchParams.get("discreto") !== "1";
  const equiposTercero = proyecto.equipos
    .filter((e) => e.tipo === "EXTERNO")
    .map((e) => ({
      id: e.id,
      descripcion: [e.equipo.marca, e.equipo.modelo].filter(Boolean).join(" ") || e.equipo.descripcion,
      cantidad: e.cantidad,
      dias: e.dias,
      costoExterno: verCostos ? e.costoExterno : null,
      confirmado: e.confirmado,
      proveedor: e.proveedor,
    }));

  return NextResponse.json({
    proyecto: {
      id: proyecto.id,
      nombre: proyecto.nombre,
      fechaEvento: proyecto.fechaEvento,
      fechaMontaje: proyecto.fechaMontaje,
    },
    lineas: lineasClasificadas,
    equiposTercero,
    proveedores,
    proveedoresEvento,
  });
}
