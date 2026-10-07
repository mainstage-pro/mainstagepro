"use client";

import Migas from "@/components/giras/Migas";
import SubNav, { type EnlaceSub } from "@/app/(dashboard)/giras/[id]/SubNav";
import { CONTEXTO_RIDER_COLOR, CONTEXTO_RIDER_LABEL } from "@/lib/giras";

interface Props {
  artistaId: string;
  artistaNombre: string;
  riderId: string;
  nombre: string;
  version: number;
  esActivo: boolean;
  formacion: string | null;
  contexto: string;
  archivoUrl: string | null;
  archivoNombre: string | null;
  inputs: number;
  outputs: number;
  conceptos: number;
  contactos: number;
  anexos: number;
  enlaces: EnlaceSub[];
}

export default function CabeceraRider(p: Props) {
  return (
    <div className="px-4 md:px-6 pt-4 md:pt-6 border-b border-[#1a1a1a]">
      <Migas
        items={[
          { label: "Artistas", href: "/giras/artistas" },
          { label: p.artistaNombre, href: `/giras/artista/${p.artistaId}` },
          { label: "Riders", href: `/giras/artista/${p.artistaId}/riders` },
          { label: `v${p.version}` },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mt-1.5 mb-3">
        <div className="min-w-0">
          <h1 className="ms-h1 truncate">{p.nombre}</h1>
          <p className="ms-subtitle mt-0.5">
            v{p.version}
            {p.formacion ? ` · ${p.formacion}` : ""}
            {` · ${p.inputs} inputs · ${p.outputs} mixes · ${p.conceptos} ${
              p.conceptos === 1 ? "concepto" : "conceptos"
            } de equipo`}
            {" · "}
            {p.contactos} {p.contactos === 1 ? "contacto" : "contactos"} · {p.anexos}{" "}
            {p.anexos === 1 ? "anexo" : "anexos"}
          </p>
        </div>
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          <span className={`ms-badge ${CONTEXTO_RIDER_COLOR[p.contexto] ?? "ms-badge-gray"}`}>
            {CONTEXTO_RIDER_LABEL[p.contexto] ?? p.contexto}
          </span>
          {/* «Vigente» es por contexto: el de festival no apaga al de tour. */}
          {p.esActivo ? (
            <span className="ms-badge ms-badge-gold">Vigente en {CONTEXTO_RIDER_LABEL[p.contexto] ?? p.contexto}</span>
          ) : (
            <span className="ms-badge ms-badge-gray">Versión histórica</span>
          )}
          {/* El paquete técnico se baja desde el rider, sin necesidad de una gira:
              el booker lo pide para cotizar y el venue para parchar. */}
          <a
            className="ms-btn-secondary"
            href={`/api/artista-riders/${p.riderId}/documentos/rider?inline=1`}
            target="_blank"
            rel="noreferrer"
          >
            Rider PDF
          </a>
          <a
            className="ms-btn-ghost"
            href={`/api/artista-riders/${p.riderId}/documentos/input-list?inline=1`}
            target="_blank"
            rel="noreferrer"
          >
            Input/output list
          </a>
          {/* El PDF que mandó el artista se queda fijo para consulta: no sustituye
              a la ficha, se cotejan uno contra otro. */}
          {p.archivoUrl && (
            <a className="ms-btn-ghost" href={p.archivoUrl} target="_blank" rel="noreferrer">
              {p.archivoNombre ?? "PDF del artista"}
            </a>
          )}
        </div>
      </div>

      <SubNav enlaces={p.enlaces} scope="rider" />
    </div>
  );
}
