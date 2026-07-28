import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Estándares del puesto del colaborador, para precargarlos al crear su evaluación.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const personalId = req.nextUrl.searchParams.get("personalId");
  if (!personalId) return NextResponse.json({ error: "personalId requerido" }, { status: 400 });

  const persona = await prisma.personalInterno.findUnique({
    where: { id: personalId },
    select: { puestoRef: { select: { nombre: true, estandares: true } } },
  });

  let estandares: { subarea: string; responsabilidad: string; estandar: string }[] = [];
  try {
    const v = JSON.parse(persona?.puestoRef?.estandares ?? "[]");
    if (Array.isArray(v)) {
      estandares = v.map((e) => ({
        subarea: e?.subarea ?? "",
        responsabilidad: e?.responsabilidad ?? "",
        estandar: e?.estandar ?? "",
      }));
    }
  } catch { estandares = []; }

  return NextResponse.json({ puestoNombre: persona?.puestoRef?.nombre ?? null, estandares });
}
