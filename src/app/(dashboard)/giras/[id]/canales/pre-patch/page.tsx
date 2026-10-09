import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listasPrePatchDeGira } from "@/lib/pre-patch";
import PrePatchInterfaz from "@/components/giras/PrePatchInterfaz";

export const dynamic = "force-dynamic";

/**
 * La base del pre-patch de la interfaz, la que leen todas las fechas.
 *
 * La interfaz es la misma todo el tour y va parchada igual: aquí se captura una
 * vez. Lo que una plaza obligue a cambiar se ajusta en «Invitados y canales» de
 * esa fecha, sin mover esta lista.
 */
export default async function PrePatchGiraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true, conPrePatch: true } });
  if (!gira) notFound();

  return (
    <PrePatchInterfaz
      giraId={gira.id}
      conPrePatchInicial={gira.conPrePatch}
      listasIniciales={await listasPrePatchDeGira(id)}
    />
  );
}
