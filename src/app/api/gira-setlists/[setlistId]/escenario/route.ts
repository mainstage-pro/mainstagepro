// El setlist en hoja de escenario. Se emite por setlist para que el base y la
// variante de una fecha bajen cada uno el suyo.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generarSetlistEscenario } from "@/lib/pdf-gira/setlist-escenario";
import { respuestaPdf } from "@/lib/pdf-gira";

export async function GET(req: NextRequest, { params }: { params: Promise<{ setlistId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { setlistId } = await params;
  const pdf = await generarSetlistEscenario(setlistId);
  if (!pdf) return NextResponse.json({ error: "El setlist no existe" }, { status: 404 });

  return respuestaPdf(pdf, req.nextUrl.searchParams.get("inline") === "1");
}
