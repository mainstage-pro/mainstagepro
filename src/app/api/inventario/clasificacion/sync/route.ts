import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  aplicarEquipoAProductos, aplicarProductoAEquipos,
  previewEquipoAProductos, previewProductoAEquipos, type CambioClasif,
} from "@/lib/clasificacion-sync";

// Aplica (o previsualiza) la propagación de un solo salto en la dirección indicada;
// la unión y el respeto a "manual" viven en la lib. Con `preview: true` no escribe:
// devuelve el conjunto de registros que se afectarían, deduplicado.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const direccion: string = body.direccion || "";
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  if (!ids.length) return NextResponse.json({ error: "Sin ids" }, { status: 400 });
  if (direccion !== "equipo-a-producto" && direccion !== "producto-a-equipo") {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }

  if (body.preview) {
    const preview: CambioClasif[] = [];
    for (const id of ids) {
      preview.push(...(direccion === "equipo-a-producto" ? await previewEquipoAProductos(id) : await previewProductoAEquipos(id)));
    }
    const dedup = new Map<string, CambioClasif>();
    for (const c of preview) {
      const prev = dedup.get(c.id);
      if (!prev) dedup.set(c.id, c);
      else dedup.set(c.id, { ...prev, tiposDespues: [...new Set([...prev.tiposDespues, ...c.tiposDespues])], nichosDespues: [...new Set([...prev.nichosDespues, ...c.nichosDespues])] });
    }
    return NextResponse.json({ ok: true, preview: [...dedup.values()] });
  }

  let cambios = 0;
  if (direccion === "equipo-a-producto") {
    for (const id of ids) cambios += await aplicarEquipoAProductos(id);
  } else {
    for (const id of ids) cambios += await aplicarProductoAEquipos(id);
  }
  return NextResponse.json({ ok: true, cambios });
}
