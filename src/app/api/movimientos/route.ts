import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getTipoMovimientoMap, naturalezaDe } from "@/lib/tipos-movimiento";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const directos = req.nextUrl.searchParams.get("directos") === "true";
  const cuentaId = req.nextUrl.searchParams.get("cuentaId");

  // Cuando se filtra por cuenta se traen todos sus movimientos (sin límite).
  // Sin filtro se limita a 500 para no sobrecargar la vista global.
  const where = cuentaId
    ? { OR: [{ cuentaOrigenId: cuentaId }, { cuentaDestinoId: cuentaId }] }
    : directos ? { abono: null, cuentaPagar: null } : undefined;

  const movimientos = await prisma.movimientoFinanciero.findMany({
    where,
    include: {
      cliente: { select: { id: true, nombre: true } },
      proveedor: { select: { id: true, nombre: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
      categoria: { select: { id: true, nombre: true } },
      cuentaOrigen: { select: { id: true, nombre: true, banco: true } },
      cuentaDestino: { select: { id: true, nombre: true, banco: true } },
    },
    orderBy: { fecha: "desc" },
    ...(cuentaId ? {} : { take: 500 }),
  });

  return NextResponse.json({ movimientos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();

    // La naturaleza del tipo determina el flujo de caja:
    //   NEUTRO   → transferencia: cuentaId (origen) + cuentaDestinoId (destino)
    //   SALIDA   → el dinero sale: cuentaOrigenId = cuentaId
    //   ENTRADA  → el dinero entra: cuentaDestinoId = cuentaId
    const tipoMap = await getTipoMovimientoMap();
    const naturaleza = naturalezaDe(tipoMap, body.tipo);

    let cuentaOrigenId: string | null = null;
    let cuentaDestinoId: string | null = null;

    if (naturaleza === "NEUTRO") {
      cuentaOrigenId = body.cuentaId || null;
      cuentaDestinoId = body.cuentaDestinoId || null;
    } else if (naturaleza === "SALIDA") {
      cuentaOrigenId = body.cuentaId || null;
    } else {
      cuentaDestinoId = body.cuentaId || null;
    }

    const movimiento = await prisma.movimientoFinanciero.create({
      data: {
        fecha: new Date(body.fecha),
        tipo: body.tipo,
        cuentaOrigenId,
        cuentaDestinoId,
        clienteId: body.clienteId || null,
        proveedorId: body.proveedorId || null,
        proyectoId: body.proyectoId || null,
        categoriaId: body.categoriaId || null,
        concepto: body.concepto,
        monto: parseFloat(body.monto),
        metodoPago: body.metodoPago || "TRANSFERENCIA",
        referencia: body.referencia || null,
        notas: body.notas || null,
        creadoPor: session.id,
      },
    });

    return NextResponse.json({ movimiento });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al registrar movimiento" }, { status: 500 });
  }
}
