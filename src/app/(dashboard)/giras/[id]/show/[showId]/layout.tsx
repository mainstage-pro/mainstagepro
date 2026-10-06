import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AccesosShow from "@/components/giras/AccesosShow";
import Migas from "@/components/giras/Migas";
import SaltoShows, { type ShowHermano } from "@/components/giras/SaltoShows";
import {
  ESTADO_SHOW_COLOR,
  ESTADO_SHOW_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  diasRestantes,
  esGira,
  fmtDiasRestantes,
  fmtFechaLarga,
  resumirAdvance,
} from "@/lib/giras";
import SubNav, { type EnlaceSub } from "../../SubNav";

export const dynamic = "force-dynamic";

export default async function ShowLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; showId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id, showId } = await params;

  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: {
      id: true,
      giraId: true,
      fecha: true,
      ciudad: true,
      estado: true,
      venueId: true,
      venue: { select: { id: true, nombre: true, ciudad: true } },
      gira: {
        select: {
          id: true,
          nombre: true,
          tipo: true,
          artistaId: true,
          artista: { select: { nombre: true } },
          rider: { select: { id: true, version: true } },
        },
      },
      riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } },
    },
  });

  // El show tiene que pertenecer a la gira de la URL: si no, el enlace está roto
  // y mostrarla daría la impresión de que la gira la incluye.
  if (!show || show.giraId !== id) notFound();

  const hermanosRaw = await prisma.giraShow.findMany({
    where: { giraId: id },
    orderBy: [{ fecha: "asc" }, { orden: "asc" }],
    select: { id: true, fecha: true, ciudad: true, venue: { select: { nombre: true } } },
  });

  // Si la gira no tiene rider asignado cae el del artista, marcado como tal: es
  // la referencia que de todos modos se usa para cotejar el advance.
  const riderArtista = show.gira.rider
    ? null
    : await prisma.artistaRider.findFirst({
        where: { artistaId: show.gira.artistaId, activo: true, esActivo: true },
        select: { id: true, version: true },
      });
  const rider = show.gira.rider
    ? { ...show.gira.rider, deLaGira: true }
    : riderArtista
      ? { ...riderArtista, deLaGira: false }
      : null;

  const hermanos: ShowHermano[] = hermanosRaw.map((s) => ({
    id: s.id,
    fecha: s.fecha.toISOString(),
    ciudad: s.ciudad,
    venue: s.venue?.nombre ?? null,
  }));

  const resumen = resumirAdvance(show.riderLineas);
  const dias = diasRestantes(show.fecha);
  const tour = esGira(show.gira.tipo);

  const enlaces: EnlaceSub[] = [
    { href: `/giras/${id}/show/${showId}`, label: "Resumen", llave: "resumen", exacto: true },
    { href: `/giras/${id}/show/${showId}/advance`, label: "Advance", llave: "advance" },
    { href: `/giras/${id}/show/${showId}/dia`, label: "Día del show", llave: "dia" },
    { href: `/giras/${id}/show/${showId}/site-plan`, label: "Site plan", llave: "site-plan" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 md:px-6 pt-4 md:pt-6 border-b border-[#1a1a1a]">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Migas
            items={[
              { label: "Shows y giras", href: "/giras/lista" },
              { label: show.gira.nombre, href: `/giras/${id}` },
              { label: tour ? "Shows" : "Show", href: `/giras/${id}/shows` },
              { label: show.ciudad ?? show.venue?.ciudad ?? "Este show" },
            ]}
          />
          <SaltoShows giraId={id} showId={showId} hermanos={hermanos} />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mt-1.5 mb-3">
          <div className="min-w-0">
            <h1 className="ms-h1 truncate">
              {show.ciudad ?? show.venue?.ciudad ?? "Sin ciudad"}
              {show.venue ? ` · ${show.venue.nombre}` : ""}
            </h1>
            <p className="ms-subtitle mt-0.5 capitalize">
              {fmtFechaLarga(show.fecha)}
              <span className="text-[#555] normal-case"> · {fmtDiasRestantes(dias)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ESTADO_SHOW_COLOR[show.estado] ?? ""}`}>
              {ESTADO_SHOW_LABEL[show.estado] ?? show.estado}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${SEMAFORO_COLOR[resumen.semaforo] ?? ""}`}>
              Advance {resumen.avance}% · {SEMAFORO_LABEL[resumen.semaforo] ?? resumen.semaforo}
            </span>
          </div>
        </div>

        <div className="mb-3">
          <AccesosShow
            artistaId={show.gira.artistaId}
            artistaNombre={show.gira.artista.nombre}
            venueId={show.venueId}
            venueNombre={show.venue?.nombre ?? null}
            rider={rider}
          />
        </div>

        <SubNav enlaces={enlaces} scope="show" />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
