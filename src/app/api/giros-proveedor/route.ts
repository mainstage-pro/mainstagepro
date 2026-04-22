import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Fetch persisted giros
  let giros = await prisma.giroProveedor.findMany({ orderBy: { nombre: "asc" } });

  // Auto-seed from existing proveedores on first run
  if (giros.length === 0) {
    const proveedores = await prisma.proveedor.findMany({
      select: { giro: true },
      where: { giro: { not: null } },
    });
    const nombres = [...new Set(proveedores.map(p => p.giro!).filter(Boolean))].sort();
    if (nombres.length > 0) {
      await prisma.giroProveedor.createMany({
        data: nombres.map(nombre => ({ nombre })),
        skipDuplicates: true,
      });
      giros = await prisma.giroProveedor.findMany({ orderBy: { nombre: "asc" } });
    }
  }

  return NextResponse.json(giros.map(g => g.nombre));
}

export async function POST(req: Request) {
  const { nombre } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const giro = await prisma.giroProveedor.upsert({
    where: { nombre: nombre.trim() },
    update: {},
    create: { nombre: nombre.trim() },
  });

  return NextResponse.json(giro, { status: 201 });
}
