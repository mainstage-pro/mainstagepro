import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureCatalogoTables } from "@/lib/catalogo-eventos";

function toJsonArray(v: unknown): string | null {
  if (Array.isArray(v)) return v.length ? JSON.stringify(v) : null;
  if (typeof v === "string" && v.trim()) return v;
  return null;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await ensureCatalogoTables();

  const body = await req.json();
  const nombre = String(body.nombre || "").trim();
  if (!nombre) return NextResponse.json({ error: "nombre requerido" }, { status: 400 });

  const maxOrden = await prisma.adicional.aggregate({ _max: { orden: true } });
  const adicional = await prisma.adicional.create({
    data: {
      nombre,
      descripcion: body.descripcion || null,
      tiposEvento: toJsonArray(body.tiposEvento) ?? "[]",
      nichos: toJsonArray(body.nichos),
      frecuencia: body.frecuencia === "ocasional" ? "ocasional" : "frecuente",
      productoId: body.productoId || null,
      imagenUrl: body.imagenUrl || null,
      orden: (maxOrden._max.orden ?? 0) + 1,
    },
    include: { producto: { select: { id: true, nombre: true } } },
  });
  return NextResponse.json({ adicional }, { status: 201 });
}
