import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const insumos = await prisma.insumo.findMany({
    where: { activo: true },
    orderBy: [{ categoria: "asc" }, { orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ insumos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const nombre = String(body.nombre ?? "").trim();
  if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const insumo = await prisma.insumo.create({
    data: {
      nombre,
      descripcion: body.descripcion || null,
      usoPrincipal: body.usoPrincipal || null,
      porQueNecesario: body.porQueNecesario || null,
      categoria: body.categoria || "GENERAL",
      unidad: body.unidad || "pieza",
      cantidadActual: Number(body.cantidadActual ?? 0),
      minimo: Number(body.minimo ?? 1),
      dondeSeCompra: body.dondeSeCompra || null,
      costoAprox: body.costoAprox === "" || body.costoAprox == null ? null : Number(body.costoAprox),
      notas: body.notas || null,
    },
  });

  return NextResponse.json({ insumo }, { status: 201 });
}
