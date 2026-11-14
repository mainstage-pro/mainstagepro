import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { bloqueoDocumento } from "@/lib/proyecto-documentos-guard";
import { generarItinerarioProyecto } from "@/lib/pdf-proyecto/itinerario";
import { respuestaPdf } from "@/lib/pdf-proyecto";

/** Itinerario de operaciones de un solo proyecto (tarjeta de Documentos). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const bloqueo = await bloqueoDocumento(id, "ITINERARIO");
  if (bloqueo) return bloqueo;

  const pdf = await generarItinerarioProyecto(id);
  if (!pdf) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  return respuestaPdf(pdf, req.nextUrl?.searchParams?.get("preview") === "1");
}
