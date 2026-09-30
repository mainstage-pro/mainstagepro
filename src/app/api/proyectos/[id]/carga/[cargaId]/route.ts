import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

type Ctx = { params: Promise<{ id: string; cargaId: string }> };

/**
 * Descarta un pase de control de carga. Existe porque el pase se llena en la
 * camioneta y a veces se abre sobre el proyecto equivocado: sin esto, el avance
 * erróneo queda pegado a la orden para siempre (renovar el enlace solo cambia la
 * URL). Las fallas que ese pase levantó se van con él, igual que cuando un
 * renglón deja de estar dañado.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Solo un administrador puede descartar un pase" }, { status: 403 });

  const { id, cargaId } = await params;

  const carga = await prisma.proyectoCarga.findFirst({
    where: { id: cargaId, proyectoId: id },
    include: { items: { select: { fallaId: true } } },
  });
  if (!carga) return NextResponse.json({ error: "Pase no encontrado" }, { status: 404 });

  const fallaIds = carga.items.map((i) => i.fallaId).filter((v): v is string => !!v);

  await prisma.$transaction([
    ...(fallaIds.length > 0 ? [prisma.fallaEquipo.deleteMany({ where: { id: { in: fallaIds } } })] : []),
    prisma.proyectoCarga.delete({ where: { id: carga.id } }),
  ]);

  await logActividad(
    session.id,
    "ELIMINAR",
    "ProyectoCarga",
    carga.id,
    `Descartó el pase de ${carga.tipo === "RETORNO" ? "retorno" : "salida"} del control de carga`
  );

  return NextResponse.json({ ok: true, fallasEliminadas: fallaIds.length });
}
