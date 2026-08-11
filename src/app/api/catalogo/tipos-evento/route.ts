import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureCatalogoTables } from "@/lib/catalogo-eventos";

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await ensureCatalogoTables();

  const body = await req.json();
  const nombre = String(body.nombre || "").trim();
  if (!nombre) return NextResponse.json({ error: "nombre requerido" }, { status: 400 });
  const slug = String(body.slug || slugify(nombre)).trim();

  const maxOrden = await prisma.tipoEvento.aggregate({ _max: { orden: true } });
  const tipo = await prisma.tipoEvento.create({
    data: {
      slug,
      nombre,
      emoji: body.emoji || null,
      subtitulo: body.subtitulo || null,
      descripcion: body.descripcion || null,
      orden: (maxOrden._max.orden ?? 0) + 1,
    },
  });
  return NextResponse.json({ tipo }, { status: 201 });
}
