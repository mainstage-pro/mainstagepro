"use client";

import Link from "next/link";
import SubNav, { type EnlaceSub } from "@/app/(dashboard)/giras/[id]/SubNav";

interface Props {
  artistaId: string;
  artistaNombre: string;
  nombre: string;
  version: number;
  esActivo: boolean;
  formacion: string | null;
  inputs: number;
  outputs: number;
  conceptos: number;
  enlaces: EnlaceSub[];
}

export default function CabeceraRider(p: Props) {
  return (
    <div className="px-4 md:px-6 pt-4 md:pt-6 border-b border-[#1a1a1a]">
      <Link
        href={`/giras/artista/${p.artistaId}/riders`}
        className="ms-micro text-[#555] hover:text-[#B3985B] transition-colors"
      >
        ← Riders de {p.artistaNombre}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mt-1.5 mb-3">
        <div className="min-w-0">
          <h1 className="ms-h1 truncate">{p.nombre}</h1>
          <p className="ms-subtitle mt-0.5">
            v{p.version}
            {p.formacion ? ` · ${p.formacion}` : ""} · {p.inputs} inputs · {p.outputs} mixes · {p.conceptos}{" "}
            {p.conceptos === 1 ? "concepto" : "conceptos"} de equipo
          </p>
        </div>
        <div className="shrink-0">
          {p.esActivo ? (
            <span className="ms-badge ms-badge-gold">Versión vigente</span>
          ) : (
            <span className="ms-badge ms-badge-gray">Versión histórica</span>
          )}
        </div>
      </div>

      <SubNav enlaces={p.enlaces} />
    </div>
  );
}
