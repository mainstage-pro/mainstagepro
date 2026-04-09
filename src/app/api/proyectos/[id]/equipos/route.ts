import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function miercolesLimitePago(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  let dias = (3 - d.getDay() + 7) % 7;
  if (dias < 3) dias += 7;
  d.setDate(d.getDate() + dias);
  return d;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { equipoId, tipo, cantidad, dias, costoExterno, proveedorId } = body;

  if (!equipoId) return NextResponse.json({ error: "equipoId requerido" }, { status: 400 });

  const item = await prisma.proyectoEquipo.create({
    data: {
      proyectoId: id,
      equipoId,
      tipo: tipo ?? "PROPIO",
      cantidad: cantidad ?? 1,
      dias: dias ?? 1,
      costoExterno: costoExterno ? parseFloat(costoExterno) : null,
      proveedorId: proveedorId || null,
      confirmado: false,
    },
    include: {
      equipo: { include: { categoria: { select: { nombre: true } } } },
      proveedor: { select: { nombre: true } },
    },
  });

  // ── Auto-crear CxP cuando es equipo externo con proveedor y costo ──────────
  const costo = item.costoExterno;
  if (tipo === "EXTERNO" && proveedorId && costo && costo > 0) {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { nombre: true, fechaEvento: true },
    });
    const equipoNombre = item.equipo.descripcion;
    const proveedorNombre = item.proveedor?.nombre ?? "Proveedor";
    const fechaCompromiso = miercolesLimitePago(proyecto?.fechaEvento ?? new Date());

    await prisma.cuentaPagar.create({
      data: {
        tipoAcreedor: "PROVEEDOR",
        proveedorId,
        proyectoId: id,
        concepto: `${equipoNombre} (x${cantidad ?? 1}) — ${proveedorNombre} | ${proyecto?.nombre ?? "Proyecto"}`,
        monto: costo * (cantidad ?? 1) * (dias ?? 1),
        fechaCompromiso,
        estado: "PENDIENTE",
      },
    });
  }

  return NextResponse.json({ item });
}
