"use client";

import { usePathname } from "next/navigation";
import Migas from "@/components/giras/Migas";
import SubNav, { type EnlaceSub } from "@/app/(dashboard)/giras/[id]/SubNav";
import { TIPO_FORMACION_LABEL } from "@/lib/giras";

interface Props {
  artistaId: string;
  nombre: string;
  logoUrl: string | null;
  genero: string | null;
  origen: string | null;
  tipoFormacion: string | null;
  integrantesNum: number | null;
  cliente: string | null;
  riderVigente: { nombre: string; version: number } | null;
  personas: number;
  giras: number;
  enlaces: EnlaceSub[];
}

export default function CabeceraArtista(p: Props) {
  const pathname = usePathname();

  // Dentro de una versión del rider manda la cabecera del rider: dos barras de
  // navegación encimadas no orientan, estorban.
  if (pathname.startsWith(`/giras/artista/${p.artistaId}/rider/`)) return null;

  const descripcion = [
    p.tipoFormacion ? TIPO_FORMACION_LABEL[p.tipoFormacion] ?? p.tipoFormacion : null,
    p.integrantesNum ? `${p.integrantesNum} en escena` : null,
    p.genero,
    p.origen,
    p.cliente,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="px-4 md:px-6 pt-4 md:pt-6 border-b border-[#1a1a1a]">
      <Migas
        items={[
          { label: "Shows y giras", href: "/giras/lista" },
          { label: "Artistas", href: "/giras/artistas" },
          { label: p.nombre },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mt-1.5 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {p.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.logoUrl}
              alt=""
              className="w-11 h-11 rounded-xl object-cover border border-[#1e1e1e] shrink-0"
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="ms-h1 truncate">{p.nombre}</h1>
            <p className="ms-subtitle mt-0.5 truncate">{descripcion || "Sin datos generales capturados"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {p.riderVigente ? (
            <span className="ms-badge ms-badge-gold">
              Rider v{p.riderVigente.version} vigente
            </span>
          ) : (
            <span className="ms-badge ms-badge-amber">Sin rider vigente</span>
          )}
          <span className="ms-badge ms-badge-gray">
            {p.personas} {p.personas === 1 ? "persona" : "personas"}
          </span>
          <span className="ms-badge ms-badge-gray">
            {p.giras} {p.giras === 1 ? "show o gira" : "shows y giras"}
          </span>
        </div>
      </div>

      <SubNav enlaces={p.enlaces} scope="artista" />
    </div>
  );
}
