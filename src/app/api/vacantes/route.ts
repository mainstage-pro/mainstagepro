import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jparse, type AptitudPerfil, type ConocimientoPerfil } from "@/lib/puesto";

export async function GET() {
  const puestos = await prisma.puesto.findMany({
    where: {
      activo: true,
      vacanteAbierta: true,
      formularios: { some: { formulario: { estado: "PUBLICADO" } } },
    },
    select: {
      id: true,
      nombre: true,
      area: true,
      misionPuesto: true,
      tipoContrato: true,
      modalidad: true,
      aptitudes: true,
      conocimientos: true,
      criteriosExclusion: true,
      formularios: {
        where: { formulario: { estado: "PUBLICADO" } },
        select: { formulario: { select: { slug: true } } },
        take: 1,
      },
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({
    puestos: puestos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      area: p.area,
      misionPuesto: p.misionPuesto,
      tipoContrato: p.tipoContrato,
      modalidad: p.modalidad,
      aptitudes: jparse<AptitudPerfil[]>(p.aptitudes, []),
      conocimientos: jparse<ConocimientoPerfil[]>(p.conocimientos, []),
      criteriosExclusion: jparse<string[]>(p.criteriosExclusion, []),
      formularioSlug: p.formularios[0]?.formulario.slug ?? null,
    })),
  });
}
