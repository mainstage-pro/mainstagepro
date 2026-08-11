import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseArr, previewEquipoAProductos, type CambioClasif } from "@/lib/clasificacion-sync";

// Un equipo cuenta como "clasificado" si tiene al menos un tipo de evento o si
// se marcó como no cotizable (decisión explícita de dejarlo fuera de cobertura).
function estaClasificado(e: { tiposEvento: string | null; noCotizable: boolean }): boolean {
  return parseArr(e.tiposEvento).length > 0 || e.noCotizable;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const equipos = await prisma.equipo.findMany({
    where: { activo: true },
    select: {
      id: true, descripcion: true, marca: true, modelo: true, imagenUrl: true,
      tiposEvento: true, nichos: true, rol: true, capacidadPorTipoEvento: true,
      noCotizable: true, clasifOrigen: true,
      categoria: { select: { id: true, nombre: true } },
    },
    orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
  });
  const clasificados = equipos.filter(estaClasificado).length;
  return NextResponse.json({ equipos, total: equipos.length, clasificados });
}

// Clasificación manual en lote. Marca clasifOrigen="manual" (el sync no la pisa).
// Los campos ausentes no se tocan; unión no aplica aquí (es intención humana).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const ids: string[] = Array.isArray(body.equipoIds) ? body.equipoIds.filter(Boolean) : [];
  if (!ids.length) return NextResponse.json({ error: "Sin equipos" }, { status: 400 });

  const data: Record<string, unknown> = { clasifOrigen: "manual" };
  if (body.tiposEvento !== undefined) data.tiposEvento = Array.isArray(body.tiposEvento) && body.tiposEvento.length ? JSON.stringify(body.tiposEvento) : null;
  if (body.nichos !== undefined) data.nichos = Array.isArray(body.nichos) && body.nichos.length ? JSON.stringify(body.nichos) : null;
  if (body.rol !== undefined) data.rol = body.rol || null;
  if (body.capacidadPorTipoEvento !== undefined) data.capacidadPorTipoEvento = body.capacidadPorTipoEvento && Object.keys(body.capacidadPorTipoEvento).length ? JSON.stringify(body.capacidadPorTipoEvento) : null;
  if (body.noCotizable !== undefined) data.noCotizable = !!body.noCotizable;

  await prisma.equipo.updateMany({ where: { id: { in: ids } }, data });

  // Preview del sync hacia arriba (equipo→productos) para confirmar antes de aplicar.
  const preview: CambioClasif[] = [];
  for (const id of ids) preview.push(...await previewEquipoAProductos(id));
  // Dedup por producto (varios equipos pueden apuntar al mismo).
  const dedup = new Map<string, CambioClasif>();
  for (const c of preview) {
    const prev = dedup.get(c.id);
    if (!prev) dedup.set(c.id, c);
    else dedup.set(c.id, { ...prev, tiposDespues: [...new Set([...prev.tiposDespues, ...c.tiposDespues])], nichosDespues: [...new Set([...prev.nichosDespues, ...c.nichosDespues])] });
  }
  return NextResponse.json({ ok: true, actualizados: ids.length, syncPreview: [...dedup.values()], equipoIds: ids });
}
