import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureEstrategiaSchema } from "../route";

// Corrección de redacción sobre la identidad vigente: no sube versión.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await ensureEstrategiaSchema();
  const b = await req.json();
  const vigente = await prisma.identidad.findFirst({ where: { vigente: true } });
  if (!vigente) return NextResponse.json({ error: "No hay identidad vigente" }, { status: 404 });

  const identidad = await prisma.identidad.update({
    where: { id: vigente.id },
    data: {
      proposito: b.proposito ?? vigente.proposito,
      mision: b.mision ?? vigente.mision,
      vision: b.vision ?? vigente.vision,
      frase: b.frase ?? vigente.frase,
      aQuienNoServimos: b.aQuienNoServimos ?? vigente.aQuienNoServimos,
    },
  });
  return NextResponse.json({ identidad });
}

// Cambio de fondo: congela la versión anterior y publica una nueva. La nota de
// cambio es obligatoria — si la identidad se mueve, el equipo merece saber por qué.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await ensureEstrategiaSchema();
  const b = await req.json();
  const nota = (b.notaCambio ?? "").trim();
  if (!nota) return NextResponse.json({ error: "Explica por qué cambia la identidad" }, { status: 400 });

  const anterior = await prisma.identidad.findFirst({ orderBy: { version: "desc" } });
  if (!anterior) return NextResponse.json({ error: "No hay identidad previa" }, { status: 404 });

  const [, identidad] = await prisma.$transaction([
    prisma.identidad.updateMany({ where: { vigente: true }, data: { vigente: false } }),
    prisma.identidad.create({
      data: {
        proposito: b.proposito ?? anterior.proposito,
        mision: b.mision ?? anterior.mision,
        vision: b.vision ?? anterior.vision,
        frase: b.frase ?? anterior.frase,
        aQuienNoServimos: b.aQuienNoServimos ?? anterior.aQuienNoServimos,
        version: anterior.version + 1,
        vigente: true,
        notaCambio: nota,
        publicadaEn: new Date(),
        autorId: session.id,
      },
    }),
  ]);
  return NextResponse.json({ identidad }, { status: 201 });
}
