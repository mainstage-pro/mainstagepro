// DDL aditivo para producción del feature "show suelto vs gira" + checklist de advance.
// El pooler TCP de Prisma no conecta desde local; se usa el driver HTTP de Neon.
//
// Correr ANTES del push: los campos nuevos de Tarea entran al modelo Prisma, así que
// cualquier lectura de tareas sin `select` explícito pide esas columnas y truena con
// 500 si no existen todavía (ya tiró producción dos veces este patrón).
//
// Columnas en camelCase citado, no snake_case: los modelos no llevan @map.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.prod.backup" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // ── 1. Gira.tipo (GIRA|SHOW) ───────────────────────────────────────────────
  await sql`ALTER TABLE giras ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'GIRA'`;

  // ── 2. Tarea.giraId / Tarea.giraShowId ─────────────────────────────────────
  await sql`ALTER TABLE tareas ADD COLUMN IF NOT EXISTS "giraId" text`;
  await sql`ALTER TABLE tareas ADD COLUMN IF NOT EXISTS "giraShowId" text`;
  await sql`CREATE INDEX IF NOT EXISTS "tareas_giraId_idx" ON tareas("giraId")`;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tareas_giraId_fkey') THEN
        ALTER TABLE tareas ADD CONSTRAINT "tareas_giraId_fkey"
          FOREIGN KEY ("giraId") REFERENCES giras(id) ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tareas_giraShowId_fkey') THEN
        ALTER TABLE tareas ADD CONSTRAINT "tareas_giraShowId_fkey"
          FOREIGN KEY ("giraShowId") REFERENCES gira_shows(id) ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$
  `;

  // ── 3. Tabla GiraChecklistItem ─────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS gira_checklist_items (
      id              text PRIMARY KEY,
      "giraId"        text NOT NULL,
      "showId"        text,
      frente          text NOT NULL,
      item            text NOT NULL,
      detalle         text,
      llave           text,
      estado          text NOT NULL DEFAULT 'PENDIENTE',
      responsable     text,
      notas           text,
      orden           integer NOT NULL DEFAULT 0,
      "actualizadoEn" timestamp(3),
      "createdAt"     timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     timestamp(3) NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "gira_checklist_items_giraId_idx" ON gira_checklist_items("giraId")`;
  await sql`CREATE INDEX IF NOT EXISTS "gira_checklist_items_showId_idx" ON gira_checklist_items("showId")`;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gira_checklist_items_giraId_fkey') THEN
        ALTER TABLE gira_checklist_items ADD CONSTRAINT "gira_checklist_items_giraId_fkey"
          FOREIGN KEY ("giraId") REFERENCES giras(id) ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gira_checklist_items_showId_fkey') THEN
        ALTER TABLE gira_checklist_items ADD CONSTRAINT "gira_checklist_items_showId_fkey"
          FOREIGN KEY ("showId") REFERENCES gira_shows(id) ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$
  `;

  // ── Verificación ───────────────────────────────────────────────────────────
  const giras = await sql`
    select column_name from information_schema.columns
    where table_name = 'giras' and column_name = 'tipo'
  `;
  const tareas = await sql`
    select column_name from information_schema.columns
    where table_name = 'tareas' and column_name in ('giraId','giraShowId') order by column_name
  `;
  const checklist = await sql`
    select column_name from information_schema.columns
    where table_name = 'gira_checklist_items' order by ordinal_position
  `;
  const fks = await sql`
    select conname from pg_constraint
    where conname in ('tareas_giraId_fkey','tareas_giraShowId_fkey',
                      'gira_checklist_items_giraId_fkey','gira_checklist_items_showId_fkey')
    order by conname
  `;

  console.log("giras.tipo:", giras.length === 1 ? "OK" : "FALTA");
  console.log("tareas:", tareas.map((c: any) => c.column_name));
  console.log("gira_checklist_items:", checklist.map((c: any) => c.column_name).join(", "));
  console.log("FKs:", fks.map((c: any) => c.conname));
}

main();
