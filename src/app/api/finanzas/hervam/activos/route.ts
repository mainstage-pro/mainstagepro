import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const activos = await prisma.hervamActivo.findMany({
    where: { activo: true },
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });

  const totalValorActual = activos.reduce((s, a) => s + a.valorActual, 0);
  const totalValorAdquisicion = activos.reduce((s, a) => s + a.valorAdquisicion, 0);

  return NextResponse.json({ activos, totalValorActual, totalValorAdquisicion });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, descripcion, categoria, valorAdquisicion, valorActual, fechaAdquisicion, notas } = body;

  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const activo = await prisma.hervamActivo.create({
    data: {
      nombre: nombre.trim(),
      descripcion: descripcion || null,
      categoria: categoria || "EQUIPO",
      valorAdquisicion: parseFloat(valorAdquisicion) || 0,
      valorActual: parseFloat(valorActual) || 0,
      fechaAdquisicion: fechaAdquisicion ? new Date(fechaAdquisicion) : null,
      notas: notas || null,
    },
  });

  return NextResponse.json({ activo }, { status: 201 });
}
