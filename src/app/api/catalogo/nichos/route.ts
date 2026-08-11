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
  const tipoEventoSlug = String(body.tipoEventoSlug || "").trim().toUpperCase();
  if (!nombre || !tipoEventoSlug) return NextResponse.json({ error: "nombre y tipoEventoSlug requeridos" }, { status: 400 });

  const maxOrden = await prisma.nicho.aggregate({ where: { tipoEventoSlug }, _max: { orden: true } });
  const nicho = await prisma.nicho.create({
    data: {
      tipoEventoSlug,
      nombre,
      slug: String(body.slug || slugify(nombre)).trim(),
      descripcion: body.descripcion || null,
      notasComerciales: body.notasComerciales || null,
      orden: (maxOrden._max.orden ?? -1) + 1,
    },
  });
  return NextResponse.json({ nicho }, { status: 201 });
}
