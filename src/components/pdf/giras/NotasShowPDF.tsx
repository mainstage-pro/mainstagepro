/**
 * NotasShowPDF.tsx — Notas y aprendizajes de un show puntual: sus temas, cada
 * uno con los hallazgos de falla + solución propuesta y el comentario abierto.
 * Hermano recortado de NotasAprendizajesPDF (el de toda la gira), para cuando
 * solo hace falta repartir el reporte de una fecha.
 */
import React from "react";
import { Cuerpo, Document, HeroGira, PaginaGira, PieGira, Seccion } from "./GiraDocBase";
import { TemaBloque, type TemaPdf } from "./NotasBloques";

export interface NotasShowData {
  giraNombre: string;
  artistaNombre: string;
  showTitulo: string;
  showSubtitulo: string | null;
  temas: TemaPdf[];
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

export function NotasShowPDF({ data }: { data: NotasShowData }) {
  return (
    <Document
      title={`Notas y aprendizajes — ${data.artistaNombre} — ${data.showTitulo}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
    >
      <PaginaGira>
        <HeroGira
          tag="Notas y aprendizajes"
          titulo={data.showTitulo}
          subtitulo={data.showSubtitulo ? `${data.artistaNombre} · ${data.showSubtitulo}` : data.artistaNombre}
          meta={data.giraNombre}
          logoSrc={data.logoSrc}
          logoArtistaSrc={data.logoArtistaSrc}
        />

        <PieGira
          izquierda={`${data.artistaNombre} · ${data.giraNombre}`}
          derecha={`Notas y aprendizajes · ${data.generadoEn}`}
        />

        <Cuerpo>
          <Seccion titulo={data.showTitulo}>
            {data.temas.map((t) => (
              <TemaBloque key={t.id} tema={t} />
            ))}
          </Seccion>
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
