import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { EnlaceSub } from "@/app/(dashboard)/giras/[id]/SubNav";
import CabeceraArtista from "./CabeceraArtista";

export const dynamic = "force-dynamic";

export default async function ArtistaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const artista = await prisma.artista.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      logoUrl: true,
      genero: true,
      origen: true,
      tipoFormacion: true,
      integrantesNum: true,
      activo: true,
      cliente: { select: { nombre: true, empresa: true } },
      riders: {
        where: { activo: true, esActivo: true },
        select: { nombre: true, version: true },
        take: 1,
      },
      _count: { select: { giras: true } },
    },
  });

  if (!artista || !artista.activo) notFound();

  // Las personas activas se cuentan aparte: _count no filtra por el soft delete.
  const personas = await prisma.artistaPersona.count({ where: { artistaId: id, activo: true } });

  const enlaces: EnlaceSub[] = [
    { href: `/giras/artista/${id}`, label: "Datos generales", exacto: true },
    { href: `/giras/artista/${id}/personas`, label: "Personas" },
    { href: `/giras/artista/${id}/riders`, label: "Riders" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <CabeceraArtista
        artistaId={id}
        nombre={artista.nombre}
        logoUrl={artista.logoUrl}
        genero={artista.genero}
        origen={artista.origen}
        tipoFormacion={artista.tipoFormacion}
        integrantesNum={artista.integrantesNum}
        cliente={artista.cliente ? artista.cliente.empresa || artista.cliente.nombre : null}
        riderVigente={artista.riders[0] ?? null}
        personas={personas}
        giras={artista._count.giras}
        enlaces={enlaces}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
