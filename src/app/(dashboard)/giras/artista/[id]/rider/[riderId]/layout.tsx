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
      contexto: true,
      origen: true,
      archivoNombre: true,
      artista: { select: { nombre: true } },
      canales: { select: { tipo: true } },
      _count: { select: { lineas: true, contactos: true, archivos: true } },
    },
  });

  if (!rider || !rider.activo) notFound();

  const base = `/giras/artista/${id}/rider/${riderId}`;
  // Un rider cargado es el PDF del artista: sus listas no se capturan aquí, pero
  // contactos y anexos sí se le pegan al documento.
  const cargado = rider.origen === "CARGADO";
  const enlaces: EnlaceSub[] = [
    { href: base, label: "Ficha y notas", exacto: true },
    ...(cargado
      ? []
      : [
          { href: `${base}/montaje`, label: "Montaje y soundcheck" },
          { href: `${base}/inputs`, label: "Input list" },
          { href: `${base}/outputs`, label: "Output list" },
          { href: `${base}/equipo`, label: "Equipo que pide" },
        ]),
    { href: `${base}/contactos`, label: "A quién llamar" },
    { href: `${base}/anexos`, label: "Stage plots y anexos" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <CabeceraRider
        artistaId={id}
        artistaNombre={rider.artista.nombre}
        riderId={riderId}
        nombre={rider.nombre}
        version={rider.version}
        esActivo={rider.esActivo}
        formacion={rider.formacion}
        contexto={rider.contexto}
        origen={rider.origen}
        archivoNombre={rider.archivoNombre}
        inputs={rider.canales.filter((c) => c.tipo === "INPUT").length}
        outputs={rider.canales.filter((c) => c.tipo === "OUTPUT").length}
        conceptos={rider._count.lineas}
        contactos={rider._count.contactos}
        anexos={rider._count.archivos}
        enlaces={enlaces}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
