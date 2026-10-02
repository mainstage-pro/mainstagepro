import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ESTADO_SHOW_COLOR,
  ESTADO_SHOW_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  diasRestantes,
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
      venue: { select: { id: true, nombre: true, ciudad: true } },
      gira: { select: { id: true, nombre: true, artista: { select: { nombre: true } } } },
      riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } },
    },
  });

  // El show tiene que pertenecer a la gira de la URL: si no, el enlace está roto
  // y mostrarla daría la impresión de que la gira la incluye.
  if (!show || show.giraId !== id) notFound();

  const resumen = resumirAdvance(show.riderLineas);
  const dias = diasRestantes(show.fecha);

  const enlaces: EnlaceSub[] = [
    { href: `/giras/${id}/show/${showId}`, label: "Resumen", exacto: true },
    { href: `/giras/${id}/show/${showId}/advance`, label: "Advance" },
    { href: `/giras/${id}/show/${showId}/dia`, label: "Día del show" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 md:px-6 pt-4 md:pt-6 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-1.5 ms-micro text-[#555] flex-wrap">
          <Link href={`/giras/${id}`} className="hover:text-[#B3985B] transition-colors">
            {show.gira.nombre}
          </Link>
          <span>/</span>
          <Link href={`/giras/${id}/shows`} className="hover:text-[#B3985B] transition-colors">
            Venues
          </Link>
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
              <span className="text-[#555] normal-case"> · {show.gira.artista.nombre}</span>
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

        <SubNav enlaces={enlaces} />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
