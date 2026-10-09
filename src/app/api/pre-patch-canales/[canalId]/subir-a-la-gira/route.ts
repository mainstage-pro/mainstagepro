import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { esTipoCanal, listasPrePatchDelShow, siguienteOrden } from "@/lib/pre-patch";

/**
 * Lo que esta fecha capturó pasa a ser lo que dice la gira.
 *
 * El cambio resultó no ser de la plaza: así va parchada la interfaz todo el tour.
 * En vez de repetirlo fecha por fecha se sube una vez. Un ajuste se vacía sobre
 * el puerto de la gira y desaparece; un puerto que nació en la fecha se muda a la
 * base y deja de ser solo de aquí.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { canalId } = await params;
  const puerto = await prisma.prePatchCanal.findUnique({
    where: { id: canalId },
    select: { id: true, giraId: true, showId: true, baseId: true, tipo: true, nombre: true, notas: true },
  });
  if (!puerto) return NextResponse.json({ error: "Ese puerto no existe" }, { status: 404 });
  if (!puerto.showId) {
    return NextResponse.json({ error: "Ese puerto ya es de la gira" }, { status: 400 });
  }
  if (!esTipoCanal(puerto.tipo)) {
    return NextResponse.json({ error: "El puerto tiene un tipo inválido" }, { status: 409 });
  }

  if (puerto.baseId) {
    await prisma.$transaction([
      prisma.prePatchCanal.update({
        where: { id: puerto.baseId },
        data: { nombre: puerto.nombre, notas: puerto.notas },
      }),
      // El ajuste ya no ajusta nada: la gira dice lo mismo que él.
      prisma.prePatchCanal.delete({ where: { id: puerto.id } }),
    ]);
  } else {
    await prisma.prePatchCanal.update({
      where: { id: puerto.id },
      data: { showId: null, orden: await siguienteOrden(puerto.giraId, null, puerto.tipo) },
    });
  }

  await logActividad(
    session.id,
    "ACTUALIZAR",
    "PrePatchCanal",
    puerto.baseId ?? puerto.id,
    `Subió «${puerto.nombre}» al pre-patch de la interfaz de toda la gira`,
    { giraId: puerto.giraId, showId: puerto.showId },
  );

  return NextResponse.json({ listas: await listasPrePatchDelShow(puerto.showId, puerto.giraId) });
}
