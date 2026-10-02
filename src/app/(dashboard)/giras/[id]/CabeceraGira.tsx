"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SubNav, { type EnlaceSub } from "./SubNav";
import { ESTADO_GIRA_COLOR, ESTADO_GIRA_LABEL, SEMAFORO_COLOR, SEMAFORO_LABEL } from "@/lib/giras";

interface Props {
  giraId: string;
  nombre: string;
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

  return (
    <div className="px-4 md:px-6 pt-4 md:pt-6 border-b border-[#1a1a1a]">
      <Link href="/giras/lista" className="ms-micro text-[#555] hover:text-[#B3985B] transition-colors">
        ← Giras
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mt-1.5 mb-3">
        <div className="min-w-0">
          <h1 className="ms-h1 truncate">{p.nombre}</h1>
          <p className="ms-subtitle mt-0.5">
            {p.artista} · {p.rango} · {p.shows} {p.shows === 1 ? "show" : "shows"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ESTADO_GIRA_COLOR[p.estado] ?? ""}`}>
            {ESTADO_GIRA_LABEL[p.estado] ?? p.estado}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${SEMAFORO_COLOR[p.semaforo] ?? ""}`}>
            Advance {p.avance}% · {SEMAFORO_LABEL[p.semaforo] ?? p.semaforo}
          </span>
        </div>
      </div>

      <SubNav enlaces={p.enlaces} />
    </div>
  );
}
