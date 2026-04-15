import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const estado = req.nextUrl.searchParams.get("estado");
  const proyectoId = req.nextUrl.searchParams.get("proyectoId");

  const ordenes = await prisma.ordenCompra.findMany({
    where: {
      ...(estado ? { estado } : {}),
      ...(proyectoId ? { proyectoId } : {}),
    },
    include: {
      proveedor: { select: { id: true, nombre: true, empresa: true, telefono: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ordenes });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { proveedorId, proyectoId, descripcion, fechaRequerida, monto, montoIva, notas, lineas } = body;

  if (!proveedorId || !descripcion) {
    return NextResponse.json({ error: "Proveedor y descripción son requeridos" }, { status: 400 });
  }

  // Generar número de orden
  const count = await prisma.ordenCompra.count();
  const numero = `OC-${String(count + 1).padStart(4, "0")}`;
  const montoNum = parseFloat(monto ?? 0);
  const ivaNum = parseFloat(montoIva ?? 0);

  const orden = await prisma.ordenCompra.create({
    data: {
      numero,
      proveedorId,
      proyectoId: proyectoId || null,
      descripcion,
      fechaRequerida: fechaRequerida ? new Date(fechaRequerida) : null,
      monto: montoNum,
      montoIva: ivaNum,
      total: montoNum + ivaNum,
      notas: notas || null,
      lineas: lineas ? JSON.stringify(lineas) : null,
      creadoPorId: session.id ?? null,
    },
    include: {
      proveedor: { select: { id: true, nombre: true, empresa: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
    },
  });

  return NextResponse.json({ orden }, { status: 201 });
}
