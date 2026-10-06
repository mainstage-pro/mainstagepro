import Link from "next/link";
import { FileMusic, Landmark, Mic2 } from "lucide-react";

export interface AccesosShowProps {
  artistaId: string;
  artistaNombre: string;
  venueId: string | null;
  venueNombre: string | null;
  rider: { id: string; version: number; deLaGira: boolean } | null;
}

const CHIP =
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#1e1e1e] bg-[#111] text-[11px] text-[#9ca3af] hover:text-white hover:border-[#B3985B]/40 transition-colors max-w-[14rem]";

/// Artista, venue y rider son los tres saltos que se hacen a diario desde un
/// show; sin estas ligas hay que salir del módulo y buscarlos a mano.
export default function AccesosShow(p: AccesosShowProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Link href={`/giras/artista/${p.artistaId}`} className={CHIP} title="Ficha del artista">
        <Mic2 className="w-3 h-3 shrink-0 text-[#B3985B]" />
        <span className="truncate">{p.artistaNombre}</span>
      </Link>

      {p.venueId && (
        <Link
          href={`/catalogo/venues?venue=${p.venueId}`}
          className={CHIP}
          title="Ficha del venue en el catálogo"
        >
          <Landmark className="w-3 h-3 shrink-0 text-[#B3985B]" />
          <span className="truncate">{p.venueNombre ?? "Venue"}</span>
        </Link>
      )}

      {p.rider && (
        <Link
          href={`/giras/artista/${p.artistaId}/rider/${p.rider.id}`}
          className={CHIP}
          title={
            p.rider.deLaGira
              ? "Rider maestro de esta gira"
              : "La gira no tiene rider asignado: éste es el vigente del artista"
          }
        >
          <FileMusic className="w-3 h-3 shrink-0 text-[#B3985B]" />
          <span className="truncate">
            Rider v{p.rider.version}
            {p.rider.deLaGira ? "" : " (del artista)"}
          </span>
        </Link>
      )}
    </div>
  );
}
