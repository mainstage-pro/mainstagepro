import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProcesoTablas } from "@/lib/migraciones-lazy";
import { ETAPA_INTERNA_LABELS, esEtapaInterna, type EtapaInterna } from "@/lib/proceso/valores";

// Estructura de subetapas activas agrupada por etapa, para la UI (barra y selector
// de sub-etapa del trato). Incluye las subetapas custom creadas desde /crm/proceso.
export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProcesoTablas();

  const subetapas = await prisma.procesoSubetapa.findMany({
    where: { activa: true },
    orderBy: [{ etapa: "asc" }, { orden: "asc" }],
    select: { etapa: true, etapaInterna: true, nombre: true },
  });

  const estructura: Record<string, { key: string; label: string }[]> = {};
  for (const s of subetapas) {
    const label = esEtapaInterna(s.etapaInterna)
      ? ETAPA_INTERNA_LABELS[s.etapaInterna as EtapaInterna]
      : s.nombre;
    (estructura[s.etapa] ??= []).push({ key: s.etapaInterna, label });
  }

  return NextResponse.json({ estructura });
}
