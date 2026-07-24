import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProcesoTablas } from "@/lib/migraciones-lazy";
import { esEtapa } from "@/lib/proceso/valores";

// Genera un código único para la subetapa a partir del nombre.
// CUSTOM_<SLUG> evita colisiones con los códigos base del proceso.
function slugCodigo(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `CUSTOM_${base || "SUBETAPA"}`;
}

// Crea una subetapa nueva dentro de una etapa. La etapa debe existir; el código
// interno (etapaInterna) se genera automáticamente y debe ser único.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProcesoTablas();
  const body = await req.json();
  const { etapa, nombre } = body;

  if (!esEtapa(etapa) || !nombre || typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "etapa válida y nombre requeridos" }, { status: 400 });
  }

  // Genera un código único: si ya existe, agrega un sufijo incremental.
  const raiz = slugCodigo(nombre.trim());
  let etapaInterna = raiz;
  let intento = 2;
  while (await prisma.procesoSubetapa.findUnique({ where: { etapaInterna }, select: { id: true } })) {
    etapaInterna = `${raiz}_${intento++}`;
  }

  const ultimo = await prisma.procesoSubetapa.findFirst({
    where: { etapa },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const subetapa = await prisma.procesoSubetapa.create({
    data: {
      etapa,
      etapaInterna,
      nombre: nombre.trim(),
      descripcion: body.descripcion ?? null,
      orden: (ultimo?.orden ?? 0) + 1,
      generacionAutomatica: body.generacionAutomatica ?? true,
    },
  });

  return NextResponse.json({ subetapa });
}
