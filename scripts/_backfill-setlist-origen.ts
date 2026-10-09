/**
 * Backfill del alcance del setlist: liga las copias que ya existen con su
 * renglón del base y deja asentado lo que cada fecha ya había decidido.
 *
 * Hasta ahora la copia de una fecha nacía suelta, sin rastro de de dónde salió.
 * Desde que el base siembra, esa falta de rastro tiene dos consecuencias: los
 * renglones del base se volverían a sembrar duplicados, y lo que alguien borró
 * a mano en una noche reaparecería. Las dos se arreglan aquí:
 *
 *   - Lo que empata por tipo y título se liga con `origenId`. El orden no sirve
 *     de llave: reacomodar la noche es justamente para lo que está la copia.
 *   - Lo que está en la fecha y no en el base nació ahí (el invitado, el cover):
 *     se queda sin ligar, que es lo correcto, y la siembra no lo toca.
 *   - Lo que está en el base y la fecha ya no tiene se borró a propósito: se
 *     acota el renglón del base para que esa noche quede fuera.
 *
 * Corre en seco salvo que se le pase APLICAR=1.
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const aplicar = process.env.APLICAR === "1";

interface Fila {
  id: string;
  setlistId: string;
  orden: number;
  tipo: string;
  titulo: string;
  soloEnShows: string[];
}

const llave = (f: Fila) => `${f.tipo}|${f.titulo.trim().toLowerCase()}`;

async function main() {
  const bases = (await sql`
    SELECT id, "giraId" FROM gira_setlists WHERE "esBase" = true AND "showId" IS NULL
  `) as { id: string; giraId: string }[];

  let ligados = 0;
  let acotados = 0;
  let propios = 0;

  for (const base of bases) {
    const [filasBase, fechas, shows] = await Promise.all([
      sql`SELECT id, "setlistId", orden, tipo, titulo, "soloEnShows" FROM gira_setlist_canciones
          WHERE "setlistId" = ${base.id} ORDER BY orden, "createdAt"` as Promise<Fila[]>,
      sql`SELECT id, "showId" FROM gira_setlists
          WHERE "giraId" = ${base.giraId} AND "showId" IS NOT NULL` as Promise<
        { id: string; showId: string }[]
      >,
      sql`SELECT id FROM gira_shows WHERE "giraId" = ${base.giraId}` as Promise<{ id: string }[]>,
    ]);
    if (!filasBase.length || !fechas.length) continue;

    const todosLosShows = shows.map((s) => s.id);
    // Lo que cada renglón del base va perdiendo conforme se revisan las fechas.
    const alcance = new Map(
      filasBase.map((f) => [f.id, f.soloEnShows.length ? [...f.soloEnShows] : [...todosLosShows]]),
    );

    for (const fecha of fechas) {
      const filas = (await sql`
        SELECT id, "setlistId", orden, tipo, titulo, "soloEnShows" FROM gira_setlist_canciones
        WHERE "setlistId" = ${fecha.id} AND "origenId" IS NULL ORDER BY orden, "createdAt"
      `) as Fila[];

      // Emparejado glotón: una canción del base se reclama una sola vez, así que
      // las pausas repetidas se van ligando en el orden en que aparecen.
      const disponibles = new Map<string, Fila[]>();
      for (const f of filasBase) {
        const a = disponibles.get(llave(f)) ?? [];
        a.push(f);
        disponibles.set(llave(f), a);
      }

      for (const f of filas) {
        const candidatos = disponibles.get(llave(f));
        const origen = candidatos?.shift();
        if (!origen) {
          propios += 1;
          continue;
        }
        ligados += 1;
        if (aplicar) {
          await sql`UPDATE gira_setlist_canciones SET "origenId" = ${origen.id} WHERE id = ${f.id}`;
        }
      }

      for (const sobrante of [...disponibles.values()].flat()) {
        const quedan = (alcance.get(sobrante.id) ?? []).filter((s) => s !== fecha.showId);
        alcance.set(sobrante.id, quedan);
      }
    }

    for (const f of filasBase) {
      const quedan = alcance.get(f.id) ?? [];
      const antes = f.soloEnShows.length ? f.soloEnShows : todosLosShows;
      if (quedan.length === antes.length) continue;
      // Vacío significa "en todas": un renglón que ya no va en ninguna fecha se
      // deja como estaba y se reporta, antes que resucitarlo en todo el tour.
      if (!quedan.length) {
        console.log(`  ⚠ «${f.titulo}» no quedó en ninguna fecha; se deja sin acotar para revisarlo a mano.`);
        continue;
      }
      acotados += 1;
      if (aplicar) {
        await sql`UPDATE gira_setlist_canciones SET "soloEnShows" = ${quedan} WHERE id = ${f.id}`;
      }
    }
  }

  console.log(aplicar ? "Aplicado." : "En seco (corre con APLICAR=1 para escribir).");
  console.log(`  copias ligadas a su base:   ${ligados}`);
  console.log(`  renglones nacidos en la noche: ${propios}`);
  console.log(`  renglones del base acotados: ${acotados}`);
}

main();
