import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INCLUDE_HOSPEDAJE, INCLUDE_VIAJE } from "@/lib/logistica-gira";
import { nombreCrew } from "@/lib/giras";
import LogisticaClient, { type OcupanteCandidato } from "./LogisticaClient";

export const dynamic = "force-dynamic";

export default async function LogisticaGiraPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    select: {
      id: true,
      artista: { select: { nombre: true } },
      shows: { orderBy: { fecha: "asc" }, select: { id: true, fecha: true, ciudad: true } },
    },
  });

  if (!gira) notFound();

  const [hospedajes, viajes, crew, personas] = await Promise.all([
    prisma.giraHospedaje.findMany({
      where: { giraId: id },
      orderBy: [{ checkIn: "asc" }, { createdAt: "asc" }],
      include: INCLUDE_HOSPEDAJE,
    }),
    prisma.giraViaje.findMany({
      where: { giraId: id },
      orderBy: [{ salida: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
      include: INCLUDE_VIAJE,
    }),
    prisma.giraCrew.findMany({
      where: { giraId: id, activo: true },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        funcion: true,
        nombreLibre: true,
        tecnico: { select: { nombre: true } },
        persona: { select: { nombre: true } },
      },
    }),
    // El elenco del artista también duerme en el hotel aunque no esté dado de
    // alta en el crew: el rooming no debería obligar a inventarle una función.
    prisma.artistaPersona.findMany({
      where: { artista: { giras: { some: { id } } }, activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, instrumento: true },
    }),
  ]);

  const crewLigero = crew.map((c) => ({ id: c.id, nombre: nombreCrew(c), funcion: c.funcion }));

  const ocupantes: OcupanteCandidato[] = [
    ...crewLigero.map((c) => ({
      valor: `crew:${c.id}`,
      etiqueta: `${c.nombre} — ${c.funcion}`,
      grupo: "Crew de la gira",
    })),
    ...personas.map((p) => ({
      valor: `persona:${p.id}`,
      etiqueta: p.instrumento ? `${p.nombre} — ${p.instrumento}` : p.nombre,
      grupo: gira.artista.nombre,
    })),
  ];

  return (
    <div className="ms-page space-y-5 pb-16">
      <div>
        <h1 className="ms-h1">Viajes y hotel</h1>
        <p className="ms-subtitle">
          Dónde duerme cada quién y cómo se mueve la gira. El rooming se asigna de a uno y el traslado grupal cuenta por
          el grupo, no por persona.
        </p>
      </div>

      <LogisticaClient
        giraId={id}
        hospedajesIniciales={hospedajes}
        viajesIniciales={viajes}
        ocupantes={ocupantes}
        crew={crewLigero}
        shows={gira.shows}
      />
    </div>
  );
}
