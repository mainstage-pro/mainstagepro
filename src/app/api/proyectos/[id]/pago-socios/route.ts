import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── Tabla de porcentajes al inversionista según viabilidad ──────────────────
// Basada en: 50%→10%, 65%→20%, 80%→30%
const TIERS = [
  { min: 0.80, pct: 0.30, label: "Excelente (≥80%)", color: "emerald" },
  { min: 0.65, pct: 0.20, label: "Buena (65–79%)",   color: "green"   },
  { min: 0.50, pct: 0.10, label: "Viable (50–64%)",  color: "yellow"  },
  { min: 0.00, pct: 0.00, label: "Sin pago (<50%)",  color: "gray"    },
] as const;

function getTier(pctUtilidad: number) {
  for (const t of TIERS) {
    if (pctUtilidad >= t.min) return t;
  }
  return TIERS[TIERS.length - 1];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // ── Cargar proyecto con cotización, fechas y datos financieros reales ───
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      numeroProyecto: true,
      fechaEvento: true,
      fechaMontaje: true,
      cotizacion: {
        select: {
          id: true,
          numeroCotizacion: true,
          granTotal: true,
          total: true,
          porcentajeUtilidad: true,
          utilidadEstimada: true,
          estado: true,
          lineas: {
            where: { esIncluido: false, tipo: "EQUIPO_PROPIO" },
            select: {
              id: true,
              descripcion: true,
              marca: true,
              cantidad: true,
              precioUnitario: true,
              subtotal: true,
            },
          },
        },
      },
      // Datos financieros reales para calcular margen real
      cuentasCobrar: { select: { monto: true, montoCobrado: true } },
      cuentasPagar: {
        select: {
          id: true,
          socioId: true,
          monto: true,
          estado: true,
          fechaCompromiso: true,
          concepto: true,
          createdAt: true,
          tipoAcreedor: true,
        },
      },
      movimientos: { where: { tipo: "GASTO" }, select: { monto: true, tipo: true } },
      equipos: { select: { costoExterno: true, cantidad: true } },
      cierreFinanciero: { select: { margenReal: true, totalCobrado: true, totalGastado: true } },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (!proyecto.cotizacion) return NextResponse.json({ error: "Sin cotización asociada" }, { status: 404 });

  // ── Calcular días del evento ──────────────────────────────────────────────
  const fechaFin = proyecto.fechaEvento;
  const fechaInicio = proyecto.fechaMontaje ?? proyecto.fechaEvento;
  const msPerDay = 1000 * 60 * 60 * 24;
  const diasEvento = Math.max(1, Math.round((fechaFin.getTime() - fechaInicio.getTime()) / msPerDay) + 1);

  // ── Calcular viabilidad REAL (misma lógica que UI Gastos del proyecto) ────────
  let pctUtilidad: number;
  if (proyecto.cierreFinanciero && proyecto.cierreFinanciero.totalCobrado > 0) {
    // Si ya hay cierre guardado, usar el margen real del cierre
    pctUtilidad = proyecto.cierreFinanciero.margenReal / 100;
  } else {
    // Calcular en tiempo real: misma fórmula que el cierre API y la UI
    const totalCobrado = proyecto.cuentasCobrar.reduce((s, c) => s + Number(c.montoCobrado ?? 0), 0);
    const cxpNoTecPendiente = proyecto.cuentasPagar
      .filter(c => c.tipoAcreedor !== "TECNICO" && c.estado !== "LIQUIDADO")
      .reduce((s, c) => s + Number(c.monto), 0);
    const gastosMovimientos = proyecto.movimientos
      .filter(m => m.tipo === "GASTO")
      .reduce((s, m) => s + Number(m.monto), 0);
    const costoEquiposExternos = proyecto.equipos.reduce(
      (s, e) => s + Number(e.costoExterno ?? 0) * Number(e.cantidad), 0
    );
    const totalGastado = cxpNoTecPendiente + gastosMovimientos + costoEquiposExternos;
    const utilidadReal = totalCobrado - totalGastado;
    pctUtilidad = totalCobrado > 0 ? utilidadReal / totalCobrado : proyecto.cotizacion.porcentajeUtilidad ?? 0;
  }

  const tier = getTier(pctUtilidad);
  const lineasPropio = proyecto.cotizacion.lineas;
  const totalEquipoPropio = lineasPropio.reduce((s, l) => s + l.subtotal, 0);
  const montoInversionista = totalEquipoPropio * tier.pct;

  // ── Filtrar solo CxPs de socios para el mapeo ──
  const cxpsSocios = proyecto.cuentasPagar.filter(c => c.tipoAcreedor === "SOCIO" || c.socioId);

  // ── Cargar socios activos ─────────────────────────────────────────────────
  const socios = await prisma.socio.findMany({
    where: { status: "ACTIVO" },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      pctSocio: true,
    },
    orderBy: { nombre: "asc" },
  });

  // Mapear CxPs existentes por socioId
  const cxpPorSocio: Record<string, typeof cxpsSocios[0]> = {};
  for (const cxp of cxpsSocios) {
    if (cxp.socioId) cxpPorSocio[cxp.socioId] = cxp;
  }

  return NextResponse.json({
    proyecto: {
      id: proyecto.id,
      nombre: proyecto.nombre,
      numeroProyecto: proyecto.numeroProyecto,
      fechaEvento: proyecto.fechaEvento,
      fechaMontaje: proyecto.fechaMontaje,
      diasEvento,
    },
    cotizacion: {
      id: proyecto.cotizacion.id,
      numeroCotizacion: proyecto.cotizacion.numeroCotizacion,
      granTotal: proyecto.cotizacion.granTotal,
      total: proyecto.cotizacion.total,
      pctUtilidad,
      utilidadEstimada: proyecto.cotizacion.utilidadEstimada,
    },
    viabilidad: {
      pctUtilidad,
      pctFormateado: `${(pctUtilidad * 100).toFixed(1)}%`,
      tier: {
        label: tier.label,
        pct: tier.pct,
        pctFormateado: `${(tier.pct * 100).toFixed(0)}%`,
        color: tier.color,
      },
    },
    equipoPropio: {
      lineas: lineasPropio,
      total: totalEquipoPropio,
    },
    montoInversionista,
    socios: socios.map(s => ({
      ...s,
      cxpExistente: cxpPorSocio[s.id] ?? null,
    })),
    tiers: TIERS.map(t => ({
      min: t.min,
      pct: t.pct,
      label: t.label,
      color: t.color,
      activo: t.min === tier.min,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { socioId, monto, fechaCompromiso, notas, pctAplicado } = body;

  if (!socioId || !monto || !fechaCompromiso) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  // Verificar que el proyecto existe
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { nombre: true, numeroProyecto: true },
  });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  // Verificar si ya existe una CxP para este socio en este proyecto
  const existente = await prisma.cuentaPagar.findFirst({
    where: { proyectoId: id, socioId, tipoAcreedor: "SOCIO" },
  });
  if (existente) {
    return NextResponse.json(
      { error: "Ya existe una cuenta por pagar para este inversionista en este proyecto" },
      { status: 409 }
    );
  }

  const cxp = await prisma.cuentaPagar.create({
    data: {
      tipoAcreedor: "SOCIO",
      socioId,
      proyectoId: id,
      concepto: `Uso de equipos propios — ${proyecto.nombre} (${proyecto.numeroProyecto})`,
      monto: parseFloat(monto),
      montoOriginal: parseFloat(monto),
      fechaCompromiso: new Date(fechaCompromiso),
      estado: "PENDIENTE",
      notas: notas
        ? `Viabilidad aplicada: ${pctAplicado ? `${(pctAplicado * 100).toFixed(0)}%` : "—"} | ${notas}`
        : `Viabilidad aplicada: ${pctAplicado ? `${(pctAplicado * 100).toFixed(0)}%` : "—"}`,
    },
    include: {
      socio: { select: { nombre: true } },
    },
  });

  return NextResponse.json({ cxp }, { status: 201 });
}
