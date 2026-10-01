import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { bloqueoDocumento } from "@/lib/proyecto-documentos-guard";
import { generarHojaEntrega } from "@/lib/pdf-proyecto/hoja-entrega";
import { respuestaPdf } from "@/lib/pdf-proyecto";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const bloqueo = await bloqueoDocumento(id, "HOJA_ENTREGA");
  if (bloqueo) return bloqueo;

  const pdf = await generarHojaEntrega(id);
  if (!pdf) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return respuestaPdf(pdf, req.nextUrl?.searchParams?.get("preview") === "1");
}
