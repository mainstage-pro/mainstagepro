import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ArtistasCatalogoClient, { type ArtistaFila } from "./ArtistasCatalogoClient";

export const dynamic = "force-dynamic";

export default async function GirasArtistasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [artistas, clientes] = await Promise.all([
    prisma.artista.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        genero: true,
        origen: true,
        logoUrl: true,
        tipoFormacion: true,
        integrantesNum: true,
        cliente: { select: { id: true, nombre: true, empresa: true } },
        riders: {
          where: { activo: true },
          orderBy: { version: "desc" },
          select: { id: true, nombre: true, version: true, esActivo: true },
        },
        _count: { select: { giras: true, personas: true } },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.cliente.findMany({
      select: { id: true, nombre: true, empresa: true },
      orderBy: { nombre: "asc" },
      take: 400,
    }),
  ]);

  const filas: ArtistaFila[] = artistas.map((a) => {
    const activo = a.riders.find((r) => r.esActivo);
    return {
      id: a.id,
      nombre: a.nombre,
      genero: a.genero,
      origen: a.origen,
      logoUrl: a.logoUrl,
      tipoFormacion: a.tipoFormacion,
      integrantesNum: a.integrantesNum,
      cliente: a.cliente ? a.cliente.empresa || a.cliente.nombre : null,
      riderActivo: activo ? { nombre: activo.nombre, version: activo.version } : null,
      versiones: a.riders.length,
      personas: a._count.personas,
      giras: a._count.giras,
    };
  });

  return <ArtistasCatalogoClient artistas={filas} clientes={clientes} />;
}
