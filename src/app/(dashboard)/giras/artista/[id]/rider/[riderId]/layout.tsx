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
      archivoUrl: true,
      archivoNombre: true,
      artista: { select: { nombre: true } },
      canales: { select: { tipo: true } },
      _count: { select: { lineas: true, contactos: true, archivos: true } },
    },
  });

  if (!rider || !rider.activo) notFound();

  const base = `/giras/artista/${id}/rider/${riderId}`;
  // La ficha es el origen del rider, haya o no PDF del artista adjunto: el PDF
  // se queda fijo para consulta y la ficha es lo que se transcribe y se exporta.
  const enlaces: EnlaceSub[] = [
    { href: base, label: "Ficha y notas", llave: "ficha", exacto: true },
    { href: `${base}/montaje`, label: "Montaje y soundcheck", llave: "montaje" },
    { href: `${base}/inputs`, label: "Input list", llave: "inputs" },
    { href: `${base}/outputs`, label: "Output list", llave: "outputs" },
    { href: `${base}/equipo`, label: "Equipo que pide", llave: "equipo" },
    { href: `${base}/contactos`, label: "A quién llamar", llave: "contactos" },
    { href: `${base}/anexos`, label: "Stage plots y anexos", llave: "anexos" },
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
        archivoUrl={rider.archivoUrl}
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
