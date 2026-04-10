import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/inventario/disponibilidad?fechas=YYYY-MM-DD,YYYY-MM-DD,YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fechasStr = searchParams.get("fechas");

  if (!fechasStr) return NextResponse.json({ error: "fechas requerida" }, { status: 400 });

  // Construir rangos día completo para cada fecha específica
  const rangos = fechasStr.split(",").filter(Boolean).map((f) => {
    const inicio = new Date(f);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(f);
    fin.setHours(23, 59, 59, 999);
    return { inicio, fin, label: f };
  });

  if (rangos.length === 0) return NextResponse.json({ error: "Al menos una fecha requerida" }, { status: 400 });

  // Filtro OR: fechaEvento cae en alguno de los días seleccionados
  const fechaFilter = rangos.length === 1
    ? { gte: rangos[0].inicio, lte: rangos[0].fin }
    : { in: rangos.flatMap(r => [r.inicio, r.fin]) }; // fallback manual abajo

  // Para múltiples fechas usamos OR explícito
  const fechaOR = rangos.map(r => ({ fechaEvento: { gte: r.inicio, lte: r.fin } }));

  // 1. Todos los equipos propios activos
  const equipos = await prisma.equipo.findMany({
    where: { tipo: "PROPIO", activo: true },
    include: { categoria: { select: { nombre: true, orden: true } } },
    orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
  });

  // 2. Cotizaciones activas con fechaEvento en alguna de las fechas
  //    También considera fecha del trato como fallback si cotizacion.fechaEvento es null
  const tratoFechaOR = rangos.map(r => ({ trato: { fechaEventoEstimada: { gte: r.inicio, lte: r.fin } } }));

  const cotizacionesEnFecha = await prisma.cotizacion.findMany({
    where: {
      OR: [
        // Fecha directa en cotización
        ...fechaOR,
        // Fallback: fecha del trato cuando cotización no tiene fecha propia
        ...tratoFechaOR.map(f => ({ ...f, fechaEvento: null })),
      ],
      estado: { notIn: ["RECHAZADA", "VENCIDA"] },
    },
    select: {
      id: true,
      numeroCotizacion: true,
      estado: true,
      nombreEvento: true,
      fechaEvento: true,
      trato: { select: { fechaEventoEstimada: true } },
      cliente: { select: { nombre: true, empresa: true } },
      lineas: {
        where: { tipo: "EQUIPO_PROPIO", equipoId: { not: null } },
        select: { equipoId: true, cantidad: true },
      },
    },
  });

  // 3. Proyectos activos con fechaEvento en alguna de las fechas
  const proyectosEnFecha = await prisma.proyecto.findMany({
    where: {
      OR: fechaOR,
      estado: { notIn: ["CANCELADO"] },
    },
    include: {
      cliente: { select: { nombre: true, empresa: true } },
      equipos: {
        include: { equipo: { select: { id: true, descripcion: true, tipo: true } } },
      },
    },
  });

  // 4. Acumular comprometido
  const comprometido: Record<string, {
    cantidad: number;
    eventos: Array<{ tipo: "COT" | "PROY"; ref: string; nombre: string; estado: string; fecha: string | null }>
  }> = {};

  for (const cot of cotizacionesEnFecha) {
    for (const linea of cot.lineas) {
      if (!linea.equipoId) continue;
      if (!comprometido[linea.equipoId]) comprometido[linea.equipoId] = { cantidad: 0, eventos: [] };
      comprometido[linea.equipoId].cantidad += Math.round(linea.cantidad);
      const fechaCot = cot.fechaEvento ?? cot.trato.fechaEventoEstimada;
      comprometido[linea.equipoId].eventos.push({
        tipo: "COT",
        ref: cot.numeroCotizacion,
        nombre: cot.nombreEvento ?? cot.cliente.nombre,
        estado: cot.estado,
        fecha: fechaCot ? fechaCot.toISOString().split("T")[0] : null,
      });
    }
  }

  for (const proy of proyectosEnFecha) {
    for (const pe of proy.equipos) {
      if (!pe.equipoId || pe.equipo?.tipo !== "PROPIO") continue;
      if (!comprometido[pe.equipoId]) comprometido[pe.equipoId] = { cantidad: 0, eventos: [] };
      comprometido[pe.equipoId].cantidad += pe.cantidad;
      comprometido[pe.equipoId].eventos.push({
        tipo: "PROY",
        ref: proy.numeroProyecto,
        nombre: proy.nombre,
        estado: proy.estado,
        fecha: proy.fechaEvento ? proy.fechaEvento.toISOString().split("T")[0] : null,
      });
    }
  }

  // 5. Resultado por equipo
  const resultado = equipos.map((eq) => {
    const comp = comprometido[eq.id] ?? { cantidad: 0, eventos: [] };
    const disponible = eq.cantidadTotal - comp.cantidad;
    return {
      id: eq.id,
      descripcion: eq.descripcion,
      marca: eq.marca,
      modelo: eq.modelo,
      categoria: eq.categoria.nombre,
      cantidadTotal: eq.cantidadTotal,
      comprometido: comp.cantidad,
      disponible: Math.max(0, disponible),
      sobredemanda: disponible < 0 ? Math.abs(disponible) : 0,
      eventos: comp.eventos,
    };
  });

  // 6. Panel lateral — eventos encontrados
  const eventosResumen = [
    ...cotizacionesEnFecha.map((c) => {
      const fechaCot = c.fechaEvento ?? c.trato.fechaEventoEstimada;
      return {
        tipo: "COT" as const,
        ref: c.numeroCotizacion,
        nombre: c.nombreEvento ?? c.cliente.nombre,
        empresa: c.cliente.empresa,
        estado: c.estado,
        fecha: fechaCot ? fechaCot.toISOString().split("T")[0] : null,
      };
    }),
    ...proyectosEnFecha.map((p) => ({
      tipo: "PROY" as const,
      ref: p.numeroProyecto,
      nombre: p.nombre,
      empresa: (p.cliente as { empresa?: string | null }).empresa ?? null,
      estado: p.estado,
      fecha: p.fechaEvento ? p.fechaEvento.toISOString().split("T")[0] : null,
    })),
  ].sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));

  // Eliminar referencia no usada
  void fechaFilter;

  return NextResponse.json({ equipos: resultado, eventos: eventosResumen, fechas: rangos.map(r => r.label) });
}
