import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function generarCodigo(nombre: string, seq: number): string {
  // Toma hasta 3 letras mayúsculas del nombre (preferiblemente consonantes)
  const letras = nombre
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .filter((c) => !"AEIOU".includes(c))
    .slice(0, 3)
    .join("");
  const iniciales = (letras + "XXX").slice(0, 3);
  return `SOC-${iniciales}-${seq.toString().padStart(3, "0")}`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const activos = await prisma.socioActivo.findMany({
    where: { socioId: id, activo: true },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { rentas: true, mantenimientos: true } },
      mantenimientos: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, tipo: true } },
    },
  });

  return NextResponse.json({ activos });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { nombre, marca, modelo, serial, categoria, condicion, valorDeclarado, precioDia,
    pctSocioOverride, pctMainstageOverride, notas } = body;

  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const socio = await prisma.socio.findUnique({ where: { id }, select: { nombre: true } });
  if (!socio) return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 });

  const totalActivos = await prisma.socioActivo.count({ where: { socioId: id } });
  const codigo = generarCodigo(socio.nombre, totalActivos + 1);

  const activo = await prisma.socioActivo.create({
    data: {
      socioId: id,
      codigoInventario: codigo,
      nombre: nombre.trim(),
      marca: marca || null,
      modelo: modelo || null,
      serial: serial || null,
      categoria: categoria || "AUDIO",
      condicion: condicion || "BUENO",
      valorDeclarado: parseFloat(valorDeclarado) || 0,
      precioDia: parseFloat(precioDia) || 0,
      pctSocioOverride: pctSocioOverride !== undefined && pctSocioOverride !== "" ? parseFloat(pctSocioOverride) : null,
      pctMainstageOverride: pctMainstageOverride !== undefined && pctMainstageOverride !== "" ? parseFloat(pctMainstageOverride) : null,
      notas: notas || null,
    },
  });

  return NextResponse.json({ activo }, { status: 201 });
}
