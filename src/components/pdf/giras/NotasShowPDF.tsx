/**
 * NotasShowPDF.tsx — Notas y aprendizajes de un show puntual: sus temas, cada
 * uno con los hallazgos de falla + solución propuesta y el comentario abierto.
 * Hermano recortado de NotasAprendizajesPDF (el de toda la gira), para cuando
 * solo hace falta repartir el reporte de una fecha.
 */
import React from "react";
import { BandaGira, Cuerpo, Document, HeroGira, PaginaGira, PieGira, Seccion, type ItemBanda } from "./GiraDocBase";
import { resumenTemas, TemaBloque, type TemaPdf } from "./NotasBloques";

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
  // El venue manda sobre la fecha: es lo que se reconoce de un vistazo. Si no
  // se capturó venue/ciudad, la fecha se queda sola de título y no hay nada
  // que repetir en el subtítulo.
  const r = resumenTemas(data.temas);
  const banda: ItemBanda[] = (
    [
      { label: "Temas con hallazgos", valor: String(r.temas) },
      { label: "Hallazgos", valor: String(r.hallazgos) },
      r.criticos > 0 ? { label: "Críticos", valor: String(r.criticos) } : null,
    ].filter((i): i is ItemBanda => i !== null)
  );

  return (
    <Document
      title={`Documento de retroalimentación — ${data.artistaNombre} — ${data.showTitulo}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
    >
      <PaginaGira>
        <HeroGira
          tag="Documento de retroalimentación"
          titulo={data.showSubtitulo ?? data.showTitulo}
          subtitulo={data.showSubtitulo ? `${data.artistaNombre} · ${data.showTitulo}` : data.artistaNombre}
          meta={data.giraNombre}
          logoSrc={data.logoSrc}
          logoArtistaSrc={data.logoArtistaSrc}
        />
        <BandaGira items={banda} />

        <PieGira
          izquierda={`${data.artistaNombre} · ${data.giraNombre}`}
          derecha={`Documento de retroalimentación · ${data.generadoEn}`}
        />

        <Cuerpo>
          <Seccion titulo="Temas con hallazgos">
            {data.temas.map((t) => (
              <TemaBloque key={t.id} tema={t} />
            ))}
          </Seccion>
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
