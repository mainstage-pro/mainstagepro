import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const pasivos = await prisma.pasivoDeuda.findMany({
    include: {
      proveedor: { select: { id: true, nombre: true } },
      cuotas: { orderBy: { numeroCuota: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ pasivos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, proveedorId, acreedorNombre, descripcion, montoTotal, categoria, fechaAdquisicion, tasaInteres, notas } = body;

  if (!nombre || !montoTotal || !fechaAdquisicion)
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });

  const pasivo = await prisma.pasivoDeuda.create({
    data: {
      nombre,
      proveedorId: proveedorId || null,
      acreedorNombre: acreedorNombre || null,
      descripcion: descripcion || null,
      montoTotal: parseFloat(montoTotal),
      categoria: categoria || "PROVEEDOR",
      fechaAdquisicion: new Date(fechaAdquisicion),
      tasaInteres: tasaInteres ? parseFloat(tasaInteres) : null,
      notas: notas || null,
    },
    include: { proveedor: { select: { id: true, nombre: true } }, cuotas: true },
  });

  return NextResponse.json({ pasivo }, { status: 201 });
}
