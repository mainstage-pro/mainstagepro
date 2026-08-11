import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { aplicarEquipoAProductos, aplicarProductoAEquipos } from "@/lib/clasificacion-sync";

// Aplica la propagación ya confirmada por el usuario. Un solo salto en la
// dirección indicada; la unión y el respeto a "manual" viven en la lib.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const direccion: string = body.direccion || "";
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  if (!ids.length) return NextResponse.json({ error: "Sin ids" }, { status: 400 });

  let cambios = 0;
  if (direccion === "equipo-a-producto") {
    for (const id of ids) cambios += await aplicarEquipoAProductos(id);
  } else if (direccion === "producto-a-equipo") {
    for (const id of ids) cambios += await aplicarProductoAEquipos(id);
  } else {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, cambios });
}
