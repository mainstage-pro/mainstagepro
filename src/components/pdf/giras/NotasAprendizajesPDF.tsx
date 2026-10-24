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
import { C } from "../PdfShared";
import { Cuerpo, Document, HeroGira, Nota, PaginaGira, PieGira, Seccion, Tabla } from "./GiraDocBase";
import { TemaBloque, type TemaPdf } from "./NotasBloques";

export interface NotaShow {
  id: string;
  titulo: string;
  fecha: string;
  lugar: string | null;
  temas: TemaPdf[];
}

/// Para la tabla resumen: cuántos temas trajeron algo que anotar y, de eso,
/// cuántos hallazgos y cuántos de severidad crítica. Da una lectura de bulto
/// de la gira antes de entrar al detalle fecha por fecha.
function resumenShow(s: NotaShow) {
  const hallazgos = s.temas.flatMap((t) => t.hallazgos);
  const criticos = hallazgos.filter((h) => h.severidad === "CRITICA").length;
  return { temas: s.temas.length, hallazgos: hallazgos.length, criticos };
}

const INTRO =
  "Este documento concentra la retroalimentación técnica registrada en cada fecha de la gira: lo que se " +
  "identificó durante el montaje o el show, la solución que se aplicó en el momento y la propuesta de mejora " +
  "para la próxima ocasión. No es un reporte de fallas — es la memoria de lo aprendido, para que la siguiente " +
  "gira arranque un paso adelante de esta.";

export interface NotasAprendizajesData {
  giraNombre: string;
  artistaNombre: string;
  shows: NotaShow[];
  resumenGeneral: string | null;
  temasGira: TemaPdf[];
  aciertos: string | null;
  agradecimientos: string | null;
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

export function NotasAprendizajesPDF({ data }: { data: NotasAprendizajesData }) {
  return (
    <Document
      title={`Documento de retroalimentación — ${data.artistaNombre} — ${data.giraNombre}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
    >
      <PaginaGira>
        <HeroGira
          tag="Documento de retroalimentación"
          titulo={data.giraNombre}
          subtitulo={data.artistaNombre}
          meta="Mejora continua para la próxima gira"
          logoSrc={data.logoSrc}
          logoArtistaSrc={data.logoArtistaSrc}
        />

        <PieGira
          izquierda={`${data.artistaNombre} · ${data.giraNombre}`}
          derecha={`Documento de retroalimentación · ${data.generadoEn}`}
        />

        <Cuerpo>
          <Seccion titulo="Acerca de este documento">
            <Nota texto={INTRO} />
          </Seccion>

          {data.shows.length > 0 && (
            <Seccion titulo="Resumen de fechas">
              <Tabla
                columnas={[
                  { label: "Fecha", flex: 2 },
                  { label: "Lugar", flex: 3 },
                  { label: "Temas con hallazgos", flex: 2, alinear: "center" },
                  { label: "Hallazgos", flex: 1, alinear: "center" },
                  { label: "Críticos", flex: 1, alinear: "center" },
                ]}
                renglones={data.shows.map((s) => {
                  const r = resumenShow(s);
                  return {
                    tipo: "fila",
                    clave: s.id,
                    celdas: [
                      { texto: s.fecha },
                      { texto: s.lugar ?? "—" },
                      { texto: String(r.temas), fuerte: true },
                      { texto: String(r.hallazgos) },
                      { texto: r.criticos > 0 ? String(r.criticos) : "—", color: r.criticos > 0 ? C.rojo : undefined },
                    ],
                  };
                })}
              />
            </Seccion>
          )}

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

          {data.agradecimientos && (
            <Seccion titulo="Agradecimientos">
              <Nota texto={data.agradecimientos} />
            </Seccion>
          )}
        </Cuerpo>
      </PaginaGira>
    </Document>
  );
}
