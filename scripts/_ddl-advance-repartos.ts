/**
 * DDL aditivo: el advance pasa de renglón de equipo a reparto por disciplina.
 *
 * La unidad del advance deja de ser la caja y pasa a ser el bloque que se negocia
 * con el jefe técnico del foro («el PA y la consola los pones tú, la microfonía la
 * traemos»). Eso es `show_advance_repartos`.
 *
 * `show_rider_lineas` NO se borra: queda como respaldo silencioso por si algo de
 * la conversión no cuadra. Sus renglones se copian aquí una sola vez, y el script
 * es idempotente: lo que ya se copió se reconoce por (showId, disciplina,
 * descripcion) y no se duplica.
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Columnas en camelCase citado: el modelo no lleva @map en sus campos, así que
  // Prisma las va a buscar tal cual. En snake_case tronaría con 500.
  await sql`
    CREATE TABLE IF NOT EXISTS show_advance_repartos (
      id                 TEXT PRIMARY KEY,
      "showId"           TEXT NOT NULL REFERENCES gira_shows(id) ON DELETE CASCADE,
      disciplina         TEXT NOT NULL,
      "riderLineaId"     TEXT REFERENCES artista_rider_lineas(id) ON DELETE SET NULL,
      descripcion        TEXT NOT NULL,
      cantidad           INTEGER,
      unidad             TEXT,
      especificaciones   TEXT,
      prioridad          TEXT NOT NULL DEFAULT 'INDISPENSABLE',
      "cubiertoPor"      TEXT NOT NULL DEFAULT 'POR_DEFINIR',
      estado             TEXT NOT NULL DEFAULT 'PENDIENTE',
      "porConseguir"     TEXT,
      notas              TEXT,
      orden              INTEGER NOT NULL DEFAULT 0,
      "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS show_advance_repartos_show_disciplina_idx
    ON show_advance_repartos ("showId", disciplina)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS show_advance_repartos_rider_linea_idx
    ON show_advance_repartos ("riderLineaId")
  `;

  const existia = (await sql`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'show_rider_lineas') AS hay
  `) as { hay: boolean }[];

  if (!existia[0]?.hay) {
    console.log("show_advance_repartos lista. No hay show_rider_lineas que convertir.");
    return;
  }

  // Lo que se tira al convertir: costo, proveedor y equipo. El equipo de tercero
  // se captura una sola vez en el rider del proyecto y de ahí se derivan el
  // proveedor y su cuenta por pagar; el advance se manda al foro y no lleva
  // dinero. `ofrecidoCasa` tampoco se copia: ahora el inventario del venue se
  // consulta en vivo en lugar de quedar congelado en el renglón.
  const copiadas = (await sql`
    INSERT INTO show_advance_repartos (
      id, "showId", disciplina, "riderLineaId", descripcion, cantidad,
      prioridad, "cubiertoPor", estado, notas, orden, "createdAt", "updatedAt"
    )
    SELECT
      l.id,
      l."showId",
      l.disciplina,
      l."riderLineaId",
      l.concepto,
      NULLIF(l."cantidadPedida", 0),
      l.prioridad,
      l."cubiertoPor",
      l.estado,
      -- Lo que se marcó para pelearle al promotor era una columna propia; ahora
      -- es una nota, para no perder la decisión que ya se había tomado.
      NULLIF(
        CONCAT_WS(
          ' — ',
          l.notas,
          CASE WHEN l."pedirAlPromotor" THEN 'Marcado para pedirle al promotor' END
        ),
        ''
      ),
      l.orden,
      l."createdAt",
      l."updatedAt"
    FROM show_rider_lineas l
    WHERE NOT EXISTS (
      SELECT 1 FROM show_advance_repartos r
      WHERE r."showId" = l."showId"
        AND r.disciplina = l.disciplina
        AND r.descripcion = l.concepto
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `) as { id: string }[];

  const total = (await sql`SELECT COUNT(*)::int n FROM show_advance_repartos`) as { n: number }[];
  const viejas = (await sql`SELECT COUNT(*)::int n FROM show_rider_lineas`) as { n: number }[];

  console.log(`show_advance_repartos lista.`);
  console.log(`  convertidas en esta corrida: ${copiadas.length}`);
  console.log(`  repartos en total:           ${total[0].n}`);
  console.log(`  show_rider_lineas (respaldo): ${viejas[0].n}`);
}

main();
