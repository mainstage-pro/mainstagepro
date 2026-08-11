import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCatalogoTables } from "@/lib/catalogo-eventos";

// Lectura completa del catálogo. La consumen el editor admin, el wizard interno y
// el formulario público. `?todos=true` incluye inactivos (solo uso admin).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCatalogoTables();

  const todos = req.nextUrl.searchParams.get("todos") === "true";
  const soloActivos = todos ? {} : { activo: true };

  const [tipos, nichos, adicionales, preguntas] = await Promise.all([
    prisma.tipoEvento.findMany({
      where: todos ? {} : { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    }),
    prisma.nicho.findMany({
      where: soloActivos,
      orderBy: [{ tipoEventoSlug: "asc" }, { orden: "asc" }, { nombre: "asc" }],
    }),
    prisma.adicional.findMany({
      where: soloActivos,
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: { producto: { select: { id: true, nombre: true } } },
    }),
    prisma.preguntaDescubrimiento.findMany({
      where: todos ? {} : { activa: true },
      orderBy: [{ orden: "asc" }],
      include: { reglas: true },
    }),
  ]);

  return NextResponse.json({ tipos, nichos, adicionales, preguntas });
}
