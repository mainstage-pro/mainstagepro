import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const clientesPorDescubrir = await prisma.cliente.findMany({
      where: { tipoCliente: "POR_DESCUBRIR" },
      select: { id: true },
    });

    let migrados = 0;
    let yaExistian = 0;
    const errores: { clienteId: string; error: string }[] = [];

    for (const cliente of clientesPorDescubrir) {
      try {
        const prospeccionExistente = await prisma.prospeccion.findFirst({
          where: { clienteId: cliente.id },
          select: { id: true },
        });

        if (prospeccionExistente) {
          yaExistian++;
          continue;
        }

        await prisma.$transaction([
          prisma.prospeccion.create({
            data: {
              clienteId:  cliente.id,
              tipo:       "NUEVO_PROSPECTO",
              etapa:      "SIN_ETAPA",
              estado:     "SIN_ETAPA",
              origen:     "META_ADS",
              tipoEvento: "VARIOS",
            },
          }),
          prisma.cliente.update({
            where: { id: cliente.id },
            data:  { esProspecto: true },
          }),
        ]);

        migrados++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errores.push({ clienteId: cliente.id, error: msg });
      }
    }

    return NextResponse.json({ migrados, yaExistian, errores });
  } catch (error) {
    console.error("[POST /api/prospeccion/migrar-leads]", error);
    return NextResponse.json({ error: "Error en migración de leads" }, { status: 500 });
  }
}
