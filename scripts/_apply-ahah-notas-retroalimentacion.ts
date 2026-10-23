// Carga la retroalimentación de la gira AQUIHAYAQUIHAY - THE SWAGGIEST TOUR
// (octubre 2026) en GiraShow.evaluacion, un hallazgo (falla + solución +
// propuesta de mejora) por punto, respetando la estructura de
// src/lib/gira-evaluacion.ts. Fuente: notas redactadas por Mauricio.
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "fs";
import {
  emptyGiraShowEvaluacion,
  type GiraShowEvaluacionData,
  type Hallazgo,
  type Severidad,
  type TemaShowId,
} from "@/lib/gira-evaluacion";

const envFile = process.env.ENV_FILE || ".env.prod.backup";
const envRaw = readFileSync(envFile, "utf8");
const match = envRaw.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error(`No DATABASE_URL en ${envFile}`);
const raw = match[1].trim().replace(/^["']|["']$/g, "");
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const ACTUALIZADO_POR_ID = "cmnrpg62h0000zmizxpydetsm";
const ACTUALIZADO_POR_NOMBRE = "Mauricio Hernández";

function h(severidad: Severidad, falla: string, solucion: string, propuestaMejora: string): Hallazgo {
  return { id: crypto.randomUUID(), severidad, falla, solucion, propuestaMejora };
}

function construir(hallazgosPorTema: Partial<Record<TemaShowId, Hallazgo[]>>, comentariosPorTema?: Partial<Record<TemaShowId, string>>): GiraShowEvaluacionData {
  const base = emptyGiraShowEvaluacion();
  for (const [tema, hallazgos] of Object.entries(hallazgosPorTema) as [TemaShowId, Hallazgo[]][]) {
    base.temas[tema] = { ...base.temas[tema], hallazgos };
  }
  for (const [tema, comentarios] of Object.entries(comentariosPorTema ?? {}) as [TemaShowId, string][]) {
    base.temas[tema] = { ...base.temas[tema], comentarios };
  }
  base.actualizadoPorId = ACTUALIZADO_POR_ID;
  base.actualizadoPorNombre = ACTUALIZADO_POR_NOMBRE;
  base.actualizadoEn = new Date().toISOString();
  return base;
}

const FORO_CORONA = construir({
  soundcheck: [
    h(
      "IMPORTANTE",
      "El ingeniero local asignado por el foro no contaba con la experiencia necesaria para operar el evento. Mostró buena disposición y entregó correctamente el input list y el output list, pero no logró un audio limpio: se generaron múltiples feedbacks durante el soundcheck.",
      "Se tomó control de la consola para ajustar ecualización y cortes de frecuencia y evitar los feedbacks. El Foro Corona contaba con la misma consola de la empresa (Allen & Heath SQ5), lo que permitió operar el show completo sin complicaciones.",
      "Confirmar con los foros, con anticipación, que el ingeniero y los técnicos asignados cuenten con la capacitación y experiencia necesarias para operar el evento.",
    ),
    h(
      "MENOR",
      "El ingeniero local no logró limpiar las frecuencias de los monitores de piso, lo que generaba feedback en los micrófonos.",
      "Se apagaron los monitores de piso.",
      "Los artistas se sintieron cómodos sin monitores de piso y la captación de los micrófonos quedó más limpia sin ellos. Se retirarán del rider técnico al no ser necesarios.",
    ),
  ],
  show: [
    h(
      "IMPORTANTE",
      "La consola principal de audio presentó fallas en los motores de los faders: se trababan al cambiar de layer/página, tanto en inputs como en mixes/buses. Esto provocaba que, al pasar de inputs a monitores/salidas, los faders se movieran solos y alteraran la mezcla ya ajustada para cada integrante.",
      "Se utilizó la consola de FOH únicamente para los inputs, y un iPad dedicado para los monitores, evitando así el cambio de layer.",
      "Confirmar con el venue/foro que el equipo esté en condiciones óptimas, o solicitar el cambio de consola cuando no cumpla con las condiciones necesarias para el show.",
    ),
    h(
      "MENOR",
      "Al estar enfocado en operar el show como ingeniero de FOH, se dejó de monitorear activamente la mezcla de los IEM de los integrantes.",
      "Se delegó el monitoreo a Alex, ingeniero/técnico del Foro Corona; sin embargo no fue posible verificar directamente cómo se escuchaban los integrantes en sus monitores, a diferencia de las demás fechas.",
      "Aun en situaciones donde se deba cubrir simultáneamente FOH y monitores, mantener mayor supervisión sobre las mezclas de IEM de los integrantes.",
    ),
  ],
});

const LUNARIO_1 = construir({
  show: [
    h(
      "IMPORTANTE",
      "Phynx reportó que no se escuchaba bien en sus audífonos durante la primera fecha. Al revisar la configuración de su bodypack al día siguiente, se identificó que el paneo estaba casi en su totalidad hacia el canal izquierdo (solo se escuchaba ese lado) y que el sistema estaba configurado en mono.",
      "Se configuró el sistema de bodypack de manera estándar y el audio volvió a la normalidad.",
      "Revisar minuciosamente todos los sistemas y bodypacks antes de cada show para confirmar que estén en su configuración estándar, sin depender únicamente de la revisión previa del proveedor.",
    ),
    h(
      "IMPORTANTE",
      "En la primera fecha, los integrantes reportaron que entraba mucho ruido del público a través de su micrófono y, por lo tanto, a sus audífonos. Cierto nivel de ruido ambiente es normal, pero en este caso fue excesivo.",
      "En la segunda fecha se revisó, junto con la ingeniera de monitores y el ingeniero de sala, la estructura de ganancia de los micrófonos, la cual estaba demasiado abierta y por eso captaba en exceso el ruido del público.",
      "Independientemente de que la operación esté a cargo de ingenieros del foro/venue, asegurarse de que la estructura de ganancia quede correctamente ajustada.",
    ),
  ],
});

const LUNARIO_2 = construir({
  show: [
    h(
      "CRITICA",
      "Al terminar el video de introducción y dar play a la primera canción, no se escuchó ni el playback ni los micrófonos. Después del soundcheck se había utilizado la computadora y, sin notarlo, se cambió la salida de audio de la MacBook: en lugar de dirigirse a la interfaz, quedó configurada hacia los altavoces internos de la laptop.",
      "Se resolvió en el momento consultando con Phynx cómo cambiar la configuración de salida; aunque la solución ya se conocía, hubo unos segundos de bloqueo antes de aplicarla y corregir el problema.",
      "Después de un soundcheck, los equipos y configuraciones deben quedar intactos. Como responsable de audio, se debe hacer un linecheck con tiempo de anticipación antes de cada show. Se implementará de forma rigurosa, como parte del proceso de pre-show, un linecheck de cada micrófono y del playback de Ableton.",
    ),
    h(
      "IMPORTANTE",
      "Hubo falta de coordinación entre algunas áreas del show, principalmente en los happenings y en la manera en que debían salir algunos artistas invitados, lo que generó desinformación entre partes.",
      "Se implementaron juntas por show, mecanismo que ya se aplicó desde la tercera fecha.",
      "Definir con claridad quién corre el show, quién da los pies (cues) y quién dirige en general la producción, diferenciando la coordinación de cámaras, iluminación, stage e invitados.",
    ),
  ],
});

const LUNARIO_3 = construir(
  {},
  { show: "Fecha sin incidencias. El show corrió de inicio a fin sin contratiempos técnicos ni de coordinación." },
);

const C3_STAGE = construir({
  tiemposProduccion: [
    h(
      "MENOR",
      "El soundcheck inició con algunos minutos de retraso debido a que se llegó tarde al load-in de producción de AHAH.",
      "Se adelantó el montaje al máximo posible, trabajando con mayor velocidad para recuperar el tiempo.",
      "Llegar al menos 15 minutos antes de la hora programada de load-in de producción de AHAH.",
    ),
  ],
  montaje: [
    h(
      "IMPORTANTE",
      "Durante el load-in y las primeras pruebas se identificó ruido en los micrófonos 3, 4 y 5 provisto por el proveedor. El problema se reportó con tiempo pero no se le dio seguimiento; el proveedor no ofreció solución hasta que, ya iniciado el soundcheck, el ingeniero volvió a señalarlo y se comenzó a buscar la causa.",
      "Se cambiaron las cajas directas y el snake físico, identificando que el snake era el origen del ruido. Se sustituyó su uso tirando líneas directas del receptor hacia las entradas de la interfaz, lo que eliminó el problema.",
      "Reportar cualquier falla identificada de inmediato y no dejar el renglón pendiente hasta que se confirme una solución.",
    ),
  ],
  show: [
    h(
      "CRITICA",
      "En el mix de monitores de Nehly se seguía escuchando la voz de Jay Lee, a pesar de que su canal se bajó a 0 dB (completamente silenciado/muteado). La situación comenzó en el soundcheck; se intentó corregir después de este, pero persistió durante el show, generando incomodidad en Nehly, hasta que se identificó la causa alrededor de la tercera canción: por un posible routeo desde Ableton, las voces de Nehly y Jay Lee salían por el mismo canal.",
      "Se asignó a Jay Lee el micrófono 6 (spare); en lugar de subir su canal original en los mixes, se subió el canal spare tanto en el mix de Jay Lee como en los de los demás integrantes, resolviendo el problema.",
      "Revisar y corroborar el routeo correcto de canales en Ableton antes de cada show.",
    ),
    h(
      "IMPORTANTE",
      "Se presentaron fallas en dos ocasiones al disparar los videos del grupo.",
      "Se eligió otro momento para reproducir el video, pero también presentó problemas.",
      "No se identificó con certeza la causa ni una solución definitiva en el momento. Se propone probar el disparo del video con anticipación y contar con una alternativa B, ya que no se tuvo claro qué hacer y se esperó demasiado tiempo para resolverlo.",
    ),
  ],
});

const SHOWS: { id: string; titulo: string; data: GiraShowEvaluacionData }[] = [
  { id: "cmuqf37ue00062aivaraie5qu", titulo: "Foro Corona — 9 oct", data: FORO_CORONA },
  { id: "cmuqf572n0001vraddxhllpqq", titulo: "Lunario 1 — 11 oct", data: LUNARIO_1 },
  { id: "cmuqg8gmw0001bh2v1n4yl01c", titulo: "Lunario 2 — 12 oct", data: LUNARIO_2 },
  { id: "cmuqg8n9x00016biaet5g4b5y", titulo: "Lunario 3 — 13 oct", data: LUNARIO_3 },
  { id: "cmuqf6b650002122rlg1foriq", titulo: "C3 Stage — 17 oct", data: C3_STAGE },
];

async function main() {
  const ids = SHOWS.map((s) => s.id);
  const current = (await sql.query(`SELECT id, evaluacion FROM gira_shows WHERE id = ANY($1)`, [ids])) as any[];
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = `scripts/_backup-ahah-gira-shows-evaluacion-${ts}.json`;
  writeFileSync(backupFile, JSON.stringify(current, null, 2));
  console.log(`Backup de ${current.length} shows → ${backupFile}`);

  for (const s of SHOWS) {
    await sql.query(`UPDATE gira_shows SET evaluacion = $1 WHERE id = $2`, [JSON.stringify(s.data), s.id]);
    console.log(`Actualizado: ${s.titulo} (${s.id})`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
