/**
 * NotasAprendizajesPDF.tsx — Notas y aprendizajes de la gira.
 *
 * Un documento, no uno por show: las notas de cada fecha (coordinación,
 * tiempos, montaje, soundcheck, show, desmontaje) seguidas de la autocrítica
 * general de la gira, para la junta de equipo. Los shows sin contenido ya se
 * filtraron antes de llegar aquí; `Nota` además se calla sola si un campo
 * puntual vino vacío.
 */
import React from "react";
import { Cuerpo, Document, HeroGira, Nota, PaginaGira, PieGira, Seccion } from "./GiraDocBase";

export interface NotaCampo {
  label: string;
  texto: string | null;
}

export interface NotaShow {
  id: string;
  titulo: string;
  campos: NotaCampo[];
}

export interface NotasAprendizajesData {
  giraNombre: string;
  artistaNombre: string;
  shows: NotaShow[];
  giraCampos: NotaCampo[];
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

export function NotasAprendizajesPDF({ data }: { data: NotasAprendizajesData }) {
  return (
    <Document
      title={`Notas y aprendizajes — ${data.artistaNombre} — ${data.giraNombre}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
    >
      <PaginaGira>
        <HeroGira
          tag="Notas y aprendizajes"
          titulo={data.giraNombre}
          subtitulo={data.artistaNombre}
          meta="Mejora continua para la próxima gira"
          logoSrc={data.logoSrc}
          logoArtistaSrc={data.logoArtistaSrc}
        />

        <PieGira
          izquierda={`${data.artistaNombre} · ${data.giraNombre}`}
          derecha={`Notas y aprendizajes · ${data.generadoEn}`}
        />

        <Cuerpo>
          {data.shows.map((s) => (
            <Seccion key={s.id} titulo={s.titulo}>
              {s.campos.map((c) => (
                <Nota key={c.label} label={c.label} texto={c.texto} />
              ))}
            </Seccion>
          ))}

          <Seccion titulo="Autocrítica general de la gira">
            {data.giraCampos.map((c) => (
              <Nota key={c.label} label={c.label} texto={c.texto} />
            ))}
          </Seccion>
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
