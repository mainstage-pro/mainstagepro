/**
 * NotasAprendizajesPDF.tsx — Notas y aprendizajes de la gira.
 *
 * Un documento, no uno por show: el detalle de cada fecha (sus temas, cada
 * uno con sus hallazgos de falla + solución propuesta) seguido de los temas
 * generales de toda la producción, el resumen ejecutivo y los aciertos a
 * repetir, para la junta de equipo. Los shows sin contenido ya se filtraron
 * antes de llegar aquí.
 */
import React from "react";
import { Cuerpo, Document, HeroGira, Nota, PaginaGira, PieGira, Seccion } from "./GiraDocBase";
import { TemaBloque, type TemaPdf } from "./NotasBloques";

export interface NotaShow {
  id: string;
  titulo: string;
  temas: TemaPdf[];
}

export interface NotasAprendizajesData {
  giraNombre: string;
  artistaNombre: string;
  shows: NotaShow[];
  resumenGeneral: string | null;
  temasGira: TemaPdf[];
  aciertos: string | null;
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
              {s.temas.map((t) => (
                <TemaBloque key={t.id} tema={t} />
              ))}
            </Seccion>
          ))}

          <Seccion titulo="Resumen ejecutivo de la gira">
            <Nota texto={data.resumenGeneral} />
          </Seccion>

          {data.temasGira.length > 0 && (
            <Seccion titulo="Temas de toda la producción">
              {data.temasGira.map((t) => (
                <TemaBloque key={t.id} tema={t} />
              ))}
            </Seccion>
          )}

          <Seccion titulo="Aciertos a repetir">
            <Nota texto={data.aciertos} />
          </Seccion>
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
