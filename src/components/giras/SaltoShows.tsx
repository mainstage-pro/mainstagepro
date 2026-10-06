"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fmtFechaCorta } from "@/lib/giras";

export interface ShowHermano {
  id: string;
  fecha: string;
  ciudad: string | null;
  venue: string | null;
}

/// La pestaña viaja con el salto: de /advance del show 2 caes en /advance del 3.
/// Solo el primer segmento, porque las rutas profundas (un site plan concreto)
/// no existen en el show vecino.
function seccionActual(pathname: string, base: string) {
  const resto = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const seg = resto.split("/").filter(Boolean)[0];
  return seg ? `/${seg}` : "";
}

function titulo(s: ShowHermano) {
  return `${s.ciudad ?? s.venue ?? "Sin ciudad"} · ${fmtFechaCorta(s.fecha)}`;
}

export default function SaltoShows({
  giraId,
  showId,
  hermanos,
}: {
  giraId: string;
  showId: string;
  hermanos: ShowHermano[];
}) {
  const pathname = usePathname();

  const i = hermanos.findIndex((s) => s.id === showId);
  if (i < 0 || hermanos.length < 2) return null;

  const seccion = seccionActual(pathname, `/giras/${giraId}/show/${showId}`);
  const anterior = hermanos[i - 1];
  const siguiente = hermanos[i + 1];
  const enlace = (s: ShowHermano) => `/giras/${giraId}/show/${s.id}${seccion}`;

  const clase =
    "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[#777] hover:text-white hover:bg-[#1a1a1a] transition-colors max-w-[11rem]";

  return (
    <div className="flex items-center gap-1 shrink-0">
      {anterior ? (
        <Link href={enlace(anterior)} className={clase} title={`Show anterior: ${titulo(anterior)}`}>
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{titulo(anterior)}</span>
        </Link>
      ) : (
        <span className="px-2 py-1 text-[11px] text-[#333]">Primer show</span>
      )}

      <Link
        href={`/giras/${giraId}/shows`}
        className="px-2 py-1 rounded-lg text-[11px] text-[#555] hover:text-[#B3985B] hover:bg-[#1a1a1a] transition-colors whitespace-nowrap"
      >
        {i + 1} de {hermanos.length}
      </Link>

      {siguiente ? (
        <Link href={enlace(siguiente)} className={clase} title={`Show siguiente: ${titulo(siguiente)}`}>
          <span className="truncate">{titulo(siguiente)}</span>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        </Link>
      ) : (
        <span className="px-2 py-1 text-[11px] text-[#333]">Último show</span>
      )}
    </div>
  );
}
