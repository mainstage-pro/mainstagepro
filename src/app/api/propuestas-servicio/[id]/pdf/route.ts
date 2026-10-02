// Descarga con sesión del PDF de la propuesta de servicios.
//
// Con ?inline=1 se abre en el visor del navegador en vez de bajarse: es lo que
// usa el botón "Ver" para revisar el papel antes de mandárselo al cliente.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generarPropuestaServicio, respuestaPdf } from "@/lib/pdf-propuesta";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const pdf = await generarPropuestaServicio(id);
  if (!pdf) return NextResponse.json({ error: "La propuesta no existe" }, { status: 404 });

  return respuestaPdf(pdf, req.nextUrl.searchParams.get("inline") === "1");
}
