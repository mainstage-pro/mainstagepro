import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { ensurePlantillasTareaSubetapa } from "@/lib/plantillas-tareas-subetapa-db";

// GET /api/plantillas-tareas-subetapa[?etapaInterna=PRIMER_CONTACTO]
// Lectura para cualquier usuario autenticado (la usa el editor de /crm/proceso).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensurePlantillasTareaSubetapa();

  const etapaInterna = req.nextUrl.searchParams.get("etapaInterna");
  const items = await prisma.plantillaTareaSubetapa.findMany({
    where: { activo: true, ...(etapaInterna ? { etapaInterna } : {}) },
    orderBy: [{ etapaInterna: "asc" }, { orden: "asc" }],
  });

  return NextResponse.json({ items });
}

// POST /api/plantillas-tareas-subetapa  (solo ADMIN) → crea una tarea por defecto.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  await ensurePlantillasTareaSubetapa();

  const body = await req.json();
  const etapaInterna = String(body?.etapaInterna ?? "").trim();
  const titulo = String(body?.titulo ?? "").trim();

  if (!etapaInterna || !titulo) {
    return NextResponse.json({ error: "Faltan datos (etapaInterna, titulo)" }, { status: 400 });
  }

  const last = await prisma.plantillaTareaSubetapa.findFirst({
    where: { etapaInterna },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const item = await prisma.plantillaTareaSubetapa.create({
    data: {
      etapaInterna,
      titulo,
      descripcion: typeof body?.descripcion === "string" && body.descripcion.trim() ? body.descripcion.trim() : null,
      area: String(body?.area ?? "").trim() || "VENTAS",
      prioridad: String(body?.prioridad ?? "").trim() || "MEDIA",
      offsetDias: typeof body?.offsetDias === "number" ? body.offsetDias : null,
      orden: (last?.orden ?? -1) + 1,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
