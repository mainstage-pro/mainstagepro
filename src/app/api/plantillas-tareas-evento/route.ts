import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { ensurePlantillasTareaEvento } from "@/lib/plantillas-tareas-evento-db";
import { areaDeGrupo } from "@/lib/plantillas-tareas-evento";

// GET /api/plantillas-tareas-evento[?tipoServicio=RENTA]
// Lectura para cualquier usuario autenticado (la usa el checklist del proyecto).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensurePlantillasTareaEvento();

  const tipoServicio = req.nextUrl.searchParams.get("tipoServicio");

  const items = await prisma.plantillaTareaEvento.findMany({
    where: { activo: true, ...(tipoServicio ? { tipoServicio } : {}) },
    orderBy: [{ tipoServicio: "asc" }, { orden: "asc" }],
  });

  return NextResponse.json({ items });
}

// POST /api/plantillas-tareas-evento  (solo ADMIN) → crea un ítem sugerido.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  await ensurePlantillasTareaEvento();

  const body = await req.json();
  const tipoServicio = String(body?.tipoServicio ?? "").trim();
  const grupo = String(body?.grupo ?? "").trim();
  const titulo = String(body?.titulo ?? "").trim();

  if (!tipoServicio || !grupo || !titulo) {
    return NextResponse.json({ error: "Faltan datos (tipoServicio, grupo, titulo)" }, { status: 400 });
  }

  const area = String(body?.area ?? "").trim() || areaDeGrupo(grupo);

  // Coloca el nuevo ítem al final de su grupo.
  const last = await prisma.plantillaTareaEvento.findFirst({
    where: { tipoServicio, grupo },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const item = await prisma.plantillaTareaEvento.create({
    data: { tipoServicio, grupo, area, titulo, orden: (last?.orden ?? -1) + 1 },
  });

  return NextResponse.json({ item }, { status: 201 });
}
