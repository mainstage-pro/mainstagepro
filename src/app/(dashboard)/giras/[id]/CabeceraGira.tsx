"use client";

import { usePathname } from "next/navigation";
import Migas from "@/components/giras/Migas";
import SubNav, { type EnlaceSub } from "./SubNav";
import {
  ESTADO_GIRA_COLOR,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  TIPO_REGISTRO_COLOR,
  TIPO_REGISTRO_LABEL,
  esGira,
  estadoRegistroLabel,
} from "@/lib/giras";

interface Props {
  giraId: string;
  nombre: string;
  tipo: string;
  artistaId: string;
  artista: string;
  rango: string;
  estado: string;
  shows: number;
  avance: number;
  semaforo: string;
  enlaces: EnlaceSub[];
}

export default function CabeceraGira(p: Props) {
  const pathname = usePathname();

  // Dentro de un show manda la cabecera del propio show: dos barras de navegación
  // encimadas no orientan, estorban.
  if (pathname.startsWith(`/giras/${p.giraId}/show/`)) return null;

  const tour = esGira(p.tipo);

  return (
    <div className="px-4 md:px-6 pt-4 md:pt-6 border-b border-[#1a1a1a]">
      <Migas
        items={[
          { label: "Shows y giras", href: "/giras/lista" },
          { label: p.artista, href: `/giras/artista/${p.artistaId}` },
          { label: p.nombre },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mt-1.5 mb-3">
        <div className="min-w-0">
          <h1 className="ms-h1 truncate">{p.nombre}</h1>
          <p className="ms-subtitle mt-0.5">
            {p.artista} · {p.rango}
            {tour ? ` · ${p.shows} ${p.shows === 1 ? "show" : "shows"}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${TIPO_REGISTRO_COLOR[p.tipo] ?? ""}`}>
            {TIPO_REGISTRO_LABEL[p.tipo] ?? p.tipo}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ESTADO_GIRA_COLOR[p.estado] ?? ""}`}>
            {estadoRegistroLabel(p.estado, p.tipo)}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${SEMAFORO_COLOR[p.semaforo] ?? ""}`}>
            Advance {p.avance}% · {SEMAFORO_LABEL[p.semaforo] ?? p.semaforo}
          </span>
        </div>
      </div>

      <SubNav enlaces={p.enlaces} scope="gira" />
    </div>
  );
}
