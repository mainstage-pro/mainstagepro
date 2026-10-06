import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INCLUDE_HOSPEDAJE, INCLUDE_VIAJE } from "@/lib/logistica-gira";
import { nombreCrew } from "@/lib/giras";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
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
      grupo: "Crew",
    })),
    ...personas.map((p) => ({
      valor: `persona:${p.id}`,
      etiqueta: p.instrumento ? `${p.nombre} — ${p.instrumento}` : p.nombre,
      grupo: gira.artista.nombre,
    })),
  ];

  return (
    <div className="ms-page space-y-5 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ms-h1">Viajes y hotel</h1>
          <p className="ms-subtitle">
            Dónde duerme cada quién y cómo se mueve el equipo. El rooming se asigna de a uno y el traslado grupal cuenta por
            el grupo, no por persona.
          </p>
        </div>

        {/* La hoja de logística y rooming suelta es el libro de gira recortado a
            su sección: es justo para lo que se hizo modular. */}
        <BotonDocumentoGira
          url={`/api/giras/${id}/documentos/libro-gira`}
          query="secciones=logistica"
          label="Logística y rooming PDF"
          falta={
            viajes.length === 0 && hospedajes.length === 0
              ? "capturar un vuelo, un traslado o un hotel"
              : null
          }
          className="shrink-0 max-w-xs"
        />
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
