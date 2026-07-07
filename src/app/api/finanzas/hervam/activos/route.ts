import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const activos = await prisma.hervamActivo.findMany({
      where: { activo: true },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    });
    const totalValorActual = activos.reduce((s, a) => s + a.valorActual, 0);
    const totalValorAdquisicion = activos.reduce((s, a) => s + a.valorAdquisicion, 0);
    const totalPrecioRenta = activos.reduce((s, a) => s + (a.precioRenta ?? 0), 0);
    return NextResponse.json({ activos, totalValorActual, totalValorAdquisicion, totalPrecioRenta });
  } catch (error) {
    console.error("[HERVAM/activos GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const body = await req.json();
    const {
      nombre, marca, modelo, descripcion, cantidad,
      categoria, propietario,
      valorAdquisicion, valorActual, precioRenta,
      fechaAdquisicion, notas,
    } = body;
    if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const activo = await prisma.hervamActivo.create({
      data: {
        nombre: nombre.trim(),
        marca: marca?.trim() || null,
        modelo: modelo?.trim() || null,
        descripcion: descripcion?.trim() || null,
        cantidad: parseInt(cantidad) || 1,
        categoria: categoria || "EQUIPO",
        propietario: propietario || "MAINSTAGE",
        valorAdquisicion: parseFloat(valorAdquisicion) || 0,
        valorActual: parseFloat(valorActual) || 0,
        precioRenta: parseFloat(precioRenta) || 0,
        fechaAdquisicion: fechaAdquisicion ? new Date(fechaAdquisicion) : null,
        notas: notas?.trim() || null,
      },
    });
    return NextResponse.json({ activo }, { status: 201 });
  } catch (error) {
    console.error("[HERVAM/activos POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
