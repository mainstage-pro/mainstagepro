import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PRESTACIONES_DEFAULT, VALORES_DEFAULT } from "@/lib/puesto";
import { ensurePuestoSchema } from "@/app/api/rrhh/puestos-operativos/route";

// Catálogos que alimentan el registro de puesto: prestaciones, valores de la empresa,
// aptitudes y conocimientos (§3.4, §5). Siembra los defaults la primera vez.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePuestoSchema();

  const [nPre, nVal] = await Promise.all([
    prisma.catalogoPrestacion.count(),
    prisma.valorEmpresa.count(),
  ]);
  if (nPre === 0) {
    await prisma.catalogoPrestacion.createMany({
      data: PRESTACIONES_DEFAULT.map((nombre, orden) => ({ nombre, orden })),
    });
  }
  if (nVal === 0) {
    await prisma.valorEmpresa.createMany({
      data: VALORES_DEFAULT.map((v, orden) => ({ nombre: v.nombre, descripcion: v.descripcion, orden })),
    });
  }

  const [prestaciones, valores, aptitudes, conocimientos] = await Promise.all([
    prisma.catalogoPrestacion.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    prisma.valorEmpresa.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    prisma.catalogoAptitud.findMany({ orderBy: { nombre: "asc" } }),
    prisma.catalogoConocimiento.findMany({ orderBy: { nombre: "asc" } }),
  ]);
  return NextResponse.json({ prestaciones, valores, aptitudes, conocimientos });
}

// Crea una aptitud o conocimiento al vuelo (creación libre desde el formulario).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { tipo, nombre } = await req.json();
  const n = (nombre ?? "").trim();
  if (!n) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  try {
    if (tipo === "aptitud") {
      const row = await prisma.catalogoAptitud.upsert({ where: { nombre: n }, update: {}, create: { nombre: n } });
      return NextResponse.json({ item: row });
    }
    if (tipo === "conocimiento") {
      const row = await prisma.catalogoConocimiento.upsert({ where: { nombre: n }, update: {}, create: { nombre: n } });
      return NextResponse.json({ item: row });
    }
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
