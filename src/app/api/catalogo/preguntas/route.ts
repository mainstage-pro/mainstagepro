import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureCatalogoTables } from "@/lib/catalogo-eventos";

function toJson(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() ? v : null;
  if (Array.isArray(v)) return v.length ? JSON.stringify(v) : null;
  return JSON.stringify(v);
}

type ReglaInput = { condicion?: unknown; categoriasEquipo?: unknown; adicionalIds?: unknown };
function limpiarReglas(raw: unknown): { condicion: string; categoriasEquipo: string | null; adicionalIds: string | null }[] {
  if (!Array.isArray(raw)) return [];
  return (raw as ReglaInput[]).map((r) => ({
    condicion: toJson(r.condicion) ?? JSON.stringify({ op: "truthy" }),
    categoriasEquipo: toJson(r.categoriasEquipo),
    adicionalIds: toJson(r.adicionalIds),
  }));
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await ensureCatalogoTables();

  const body = await req.json();
  const texto = String(body.texto || "").trim();
  if (!texto) return NextResponse.json({ error: "texto requerido" }, { status: 400 });

  const maxOrden = await prisma.preguntaDescubrimiento.aggregate({ _max: { orden: true } });
  const reglas = limpiarReglas(body.reglas);
  const pregunta = await prisma.preguntaDescubrimiento.create({
    data: {
      texto,
      tipoRespuesta: body.tipoRespuesta || "SI_NO",
      opciones: toJson(body.opciones),
      nichos: toJson(body.nichos),
      orden: (maxOrden._max.orden ?? 0) + 1,
      reglas: { create: reglas },
    },
    include: { reglas: true },
  });
  return NextResponse.json({ pregunta }, { status: 201 });
}
