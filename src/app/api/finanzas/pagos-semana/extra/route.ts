import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/finanzas/pagos-semana/extra
 *
 * Crea una CxP adicional (extra de técnico/proveedor o elemento no contemplado).
 * Si el proyecto tiene fecha de evento, el miércoles se calcula automáticamente.
 * Siempre registra un MovimientoFinanciero GASTO en el proyecto.
 * Opcionalmente crea una CxC adicional si el cliente debe absorber el costo.
 *
 * Body:
 *   proyectoId   string  (requerido)
 *   tipoAcreedor "TECNICO" | "PROVEEDOR" | "OTRO"
 *   tecnicoId?   string
 *   proveedorId? string
 *   nombreLibre? string  (para OTRO o cuando no hay ID)
 *   concepto     string
 *   monto        number
 *   fechaCompromiso? string ISO  (si no se envía, se calcula miércoles post-evento)
 *   crearCxC?    boolean  (default false) → agrega a cuentas por cobrar del proyecto
 *   cxcConcepto? string
 *   cxcMonto?    number
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    proyectoId, tipoAcreedor, tecnicoId, proveedorId, nombreLibre,
    concepto, monto, fechaCompromiso,
    crearCxC, cxcConcepto, cxcMonto,
  } = body;

  if (!proyectoId || !concepto || !monto) {
    return NextResponse.json({ error: "proyectoId, concepto y monto son requeridos" }, { status: 400 });
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { nombre: true, fechaEvento: true, clienteId: true },
  });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  function proximoMiercolesTraEvento(fecha: Date): Date {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
    return d;
  }

  const fechaPago = fechaCompromiso
    ? new Date(fechaCompromiso)
    : proximoMiercolesTraEvento(proyecto.fechaEvento);

  const montoNum = parseFloat(monto);

  const [cxp, movimiento] = await prisma.$transaction(async (tx) => {
    // 1. Crear CxP
    const cxp = await tx.cuentaPagar.create({
      data: {
        tipoAcreedor: tipoAcreedor || "OTRO",
        tecnicoId: tecnicoId || null,
        proveedorId: proveedorId || null,
        proyectoId,
        concepto: nombreLibre ? `${concepto} — ${nombreLibre}` : concepto,
        monto: montoNum,
        fechaCompromiso: fechaPago,
        estado: "PENDIENTE",
        notas: nombreLibre ? `Elemento agregado fuera de cotización original: ${nombreLibre}` : null,
      },
    });

    // 2. Crear MovimientoFinanciero GASTO en el proyecto
    const movimiento = await tx.movimientoFinanciero.create({
      data: {
        tipo: "GASTO",
        fecha: new Date(),
        concepto: nombreLibre ? `${concepto} — ${nombreLibre}` : concepto,
        monto: montoNum,
        proyectoId,
        proveedorId: proveedorId || null,
        notas: "Gasto adicional registrado desde Pagos de la Semana",
        creadoPor: session.id,
      },
    });

    // 3. Crear CxC opcional (para recuperar el costo del cliente)
    if (crearCxC && proyecto.clienteId) {
      await tx.cuentaCobrar.create({
        data: {
          clienteId: proyecto.clienteId,
          proyectoId,
          concepto: cxcConcepto || `Extra: ${concepto}`,
          monto: parseFloat(cxcMonto) || montoNum,
          tipoPago: "OTRO",
          fechaCompromiso: fechaPago,
          estado: "PENDIENTE",
        },
      });
    }

    return [cxp, movimiento];
  });

  return NextResponse.json({ cxp, movimiento });
}
