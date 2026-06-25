import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET — calcular datos para el cierre (preview)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      cotizacion: { select: { granTotal: true, costosTotalesEstimados: true, utilidadEstimada: true, porcentajeUtilidad: true } },
      cuentasCobrar: { select: { monto: true, montoCobrado: true, estado: true } },
      cuentasPagar: { select: { monto: true, estado: true, concepto: true, tipoAcreedor: true } },
      movimientos: { select: { tipo: true, monto: true, concepto: true } },
      gastosOperativos: { select: { monto: true, concepto: true } },
      personal: { select: { tarifaAcordada: true, estadoPago: true, tecnico: { select: { nombre: true } } } },
      equipos: { select: { costoExterno: true, cantidad: true, proveedor: { select: { nombre: true } } } },
      cierreFinanciero: true,
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // ── Estimado (de cotización) ─────────────────────────────────────
  const granTotalEstimado = Number(proyecto.cotizacion?.granTotal ?? 0);
  const costoEstimado = Number(proyecto.cotizacion?.costosTotalesEstimados ?? 0);
  const utilidadEstimada = Number(proyecto.cotizacion?.utilidadEstimada ?? 0);

  // ── Real ─────────────────────────────────────────────────────────
  // Total cobrado = suma de CxC pagadas (montoCobrado)
  const totalCobrado = proyecto.cuentasCobrar.reduce(
    (s, c) => s + Number(c.montoCobrado ?? 0), 0
  );

  // ── Costos reales (misma lógica que la UI de "Gastos del proyecto") ──
  // 1. CxPs de técnicos (personal) — todos los registros
  const cxpTecnico = proyecto.cuentasPagar
    .filter(c => c.tipoAcreedor === "TECNICO")
    .reduce((s, c) => s + Number(c.monto), 0);

  // 2. CxPs de proveedores
  const cxpProveedor = proyecto.cuentasPagar
    .filter(c => c.tipoAcreedor === "PROVEEDOR")
    .reduce((s, c) => s + Number(c.monto), 0);

  // 3. CxPs de otros (gastos operativos convertidos a CxP)
  const cxpOtro = proyecto.cuentasPagar
    .filter(c => c.tipoAcreedor !== "TECNICO" && c.tipoAcreedor !== "PROVEEDOR")
    .reduce((s, c) => s + Number(c.monto), 0);

  // 4. Movimientos de GASTO registrados directamente (pagos reales ejecutados)
  //    El API del proyecto ya filtra movimientos WHERE tipo="GASTO"
  const gastosMovimientos = proyecto.movimientos
    .filter(m => m.tipo === "GASTO")
    .reduce((s, m) => s + Number(m.monto), 0);

  // 5. Equipos externos (costoExterno × cantidad)
  const costoEquiposExternos = proyecto.equipos.reduce(
    (s, e) => s + (Number(e.costoExterno ?? 0) * Number(e.cantidad)), 0
  );

  // Fuente de verdad: tomamos el mayor entre CxPs-técnicos y gastos de nómina en movimientos
  // para evitar doble conteo (cuando un pago a técnico se registra como movimiento Y como CxP)
  const cxpNoTecnico = cxpProveedor + cxpOtro;
  // Si hay movimientos de gasto registrados, estos son la fuente más precisa del gasto real
  // (incluyen pagos en efectivo, transferencias, etc. que pueden o no tener CxP)
  // Usamos la misma lógica que la UI: CxP no-técnico pendiente + todos los movimientos GASTO
  const cxpNoTecPendiente = proyecto.cuentasPagar
    .filter(c => c.tipoAcreedor !== "TECNICO" && c.estado !== "LIQUIDADO")
    .reduce((s, c) => s + Number(c.monto), 0);

  const totalGastado = cxpNoTecPendiente + gastosMovimientos + costoEquiposExternos;

  // Desglose de costos para visualización
  const desgloseCostos = [
    { categoria: "Personal técnico (CxP)", monto: cxpTecnico },
    { categoria: "Proveedores", monto: cxpProveedor },
    { categoria: "Gastos operativos (CxP)", monto: cxpOtro },
    { categoria: "Movimientos de gasto", monto: gastosMovimientos },
    { categoria: "Equipos externos", monto: costoEquiposExternos },
    { categoria: "CxP proveedores pendientes", monto: cxpNoTecPendiente },
  ].filter(d => d.monto > 0);

  const utilidadReal = totalCobrado - totalGastado;
  const margenReal = totalCobrado > 0 ? (utilidadReal / totalCobrado) * 100 : 0;

  return NextResponse.json({
    estimado: { granTotalEstimado, costoEstimado, utilidadEstimada },
    real: { totalCobrado, totalGastado, utilidadReal, margenReal },
    desgloseCostos,
    cierreExistente: proyecto.cierreFinanciero ?? null,
    proyecto: {
      nombre: proyecto.nombre,
      numeroProyecto: proyecto.numeroProyecto,
      estado: proyecto.estado,
    },
  });
}

// POST — guardar cierre financiero
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    granTotalEstimado, costoEstimado, utilidadEstimada,
    totalCobrado, totalGastado, utilidadReal, margenReal,
    desgloseCostos, notas,
  } = body;

  try {
    const cierre = await prisma.cierreFinanciero.upsert({
      where: { proyectoId: id },
      update: {
        granTotalEstimado, costoEstimado, utilidadEstimada,
        totalCobrado, totalGastado, utilidadReal, margenReal,
        desgloseCostos: JSON.stringify(desgloseCostos ?? []),
        notas: notas ?? null,
        cerradoEn: new Date(),
        cerradoPorId: session.id,
      },
      create: {
        proyectoId: id,
        granTotalEstimado, costoEstimado, utilidadEstimada,
        totalCobrado, totalGastado, utilidadReal, margenReal,
        desgloseCostos: JSON.stringify(desgloseCostos ?? []),
        notas: notas ?? null,
        cerradoPorId: session.id,
      },
    });

    // También marcar el proyecto como COMPLETADO si no lo está
    await prisma.proyecto.update({
      where: { id },
      data: { estado: "COMPLETADO" },
    });

    return NextResponse.json({ ok: true, cierre });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
