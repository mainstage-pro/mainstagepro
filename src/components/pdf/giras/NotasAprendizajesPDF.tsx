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
import { CabeceraShow, Cuerpo, Document, g, HeroGira, Nota, PaginaGira, PieGira, Seccion, Tabla, Text, View } from "./GiraDocBase";
import { resumenTemas, TemaBloque, type TemaPdf } from "./NotasBloques";

export interface NotaShow {
  id: string;
  fecha: string;
  lugar: string | null;
  temas: TemaPdf[];
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
            <Seccion
              titulo="Resumen de fechas"
              nota="Las cifras completas, por tema, están en el detalle de cada fecha más abajo."
            >
              <Tabla
                columnas={[
                  { label: "Show", flex: 4 },
                  { label: "Hallazgos", flex: 2, alinear: "center" },
                ]}
                renglones={data.shows.map((s) => {
                  const r = resumenTemas(s.temas);
                  return {
                    tipo: "fila",
                    clave: s.id,
                    celdas: [
                      { texto: s.lugar ?? s.fecha, sub: s.lugar ? s.fecha : null, grande: true },
                      {
                        texto: r.hallazgos > 0 ? String(r.hallazgos) : "—",
                        fuerte: true,
                        sub: r.criticos > 0 ? `${r.criticos} crítico${r.criticos > 1 ? "s" : ""}` : null,
                        colorSub: C.rojo,
                      },
                    ],
                  };
                })}
              />
            </Seccion>
          )}

          {data.shows.length > 0 && (
            <Seccion titulo="Detalle por fecha">
              {data.shows.map((s) => {
                const r = resumenTemas(s.temas);
                return (
                  <View key={s.id} style={{ marginBottom: 18 }}>
                    <CabeceraShow lugar={s.lugar} fecha={s.fecha} hallazgos={r.hallazgos} criticos={r.criticos} />
                    {s.temas.map((t) => (
                      <TemaBloque key={t.id} tema={t} />
                    ))}
                  </View>
                );
              })}
            </Seccion>
          )}

          <Seccion titulo="Resumen ejecutivo de la gira">
            <Nota texto={data.resumenGeneral} />
            {data.temasGira.length > 0 && (
              <Text style={g.subTitulo} minPresenceAhead={40}>
                Temas de toda la producción
              </Text>
            )}
            {data.temasGira.map((t) => (
              <TemaBloque key={t.id} tema={t} />
            ))}
          </Seccion>

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
