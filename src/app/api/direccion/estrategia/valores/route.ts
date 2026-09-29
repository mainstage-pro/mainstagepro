import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureEstrategiaSchema } from "../route";

async function guard() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  await ensureEstrategiaSchema();
  return session;
}

export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();
  const nombre = (b.nombre ?? "").trim();
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  const ultimo = await prisma.valorEmpresa.findFirst({ orderBy: { orden: "desc" } });
  const valor = await prisma.valorEmpresa.create({
    data: {
      nombre,
      descripcion: b.descripcion ?? null,
      comoSeVive: b.comoSeVive ?? null,
      conductas: b.conductas ? JSON.stringify(b.conductas) : null,
      orden: (ultimo?.orden ?? -1) + 1,
    },
  });
  return NextResponse.json({ valor }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const valor = await prisma.valorEmpresa.update({
    where: { id: b.id },
    data: {
      ...(b.nombre !== undefined ? { nombre: String(b.nombre).trim() } : {}),
      ...(b.descripcion !== undefined ? { descripcion: b.descripcion } : {}),
      ...(b.comoSeVive !== undefined ? { comoSeVive: b.comoSeVive } : {}),
      ...(b.conductas !== undefined ? { conductas: JSON.stringify(b.conductas) } : {}),
      ...(b.orden !== undefined ? { orden: Number(b.orden) } : {}),
    },
  });
  return NextResponse.json({ valor });
}

// Baja lógica: los puestos y acuerdos ya firmados siguen apuntando a este valor.
export async function DELETE(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await prisma.valorEmpresa.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
