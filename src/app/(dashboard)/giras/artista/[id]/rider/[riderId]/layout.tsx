import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { EnlaceSub } from "@/app/(dashboard)/giras/[id]/SubNav";
import CabeceraRider from "./CabeceraRider";

export const dynamic = "force-dynamic";

export default async function RiderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; riderId: string }>;
}) {
  const { id, riderId } = await params;

  const rider = await prisma.artistaRider.findFirst({
    where: { id: riderId, artistaId: id },
    select: {
      id: true,
      nombre: true,
      version: true,
      esActivo: true,
      formacion: true,
      activo: true,
      artista: { select: { nombre: true } },
      canales: { select: { tipo: true } },
      _count: { select: { lineas: true } },
    },
  });

  if (!rider || !rider.activo) notFound();

  const base = `/giras/artista/${id}/rider/${riderId}`;
  const enlaces: EnlaceSub[] = [
    { href: base, label: "Ficha y notas", exacto: true },
    { href: `${base}/inputs`, label: "Input list" },
    { href: `${base}/outputs`, label: "Output list" },
    { href: `${base}/equipo`, label: "Equipo que pide" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <CabeceraRider
        artistaId={id}
        artistaNombre={rider.artista.nombre}
        nombre={rider.nombre}
        version={rider.version}
        esActivo={rider.esActivo}
        formacion={rider.formacion}
        inputs={rider.canales.filter((c) => c.tipo === "INPUT").length}
        outputs={rider.canales.filter((c) => c.tipo === "OUTPUT").length}
        conceptos={rider._count.lineas}
        enlaces={enlaces}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
