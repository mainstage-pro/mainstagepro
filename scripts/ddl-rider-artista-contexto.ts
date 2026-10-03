// DDL aditivo para el rider de artista: contexto (tour/festival/privado), rider
// cargado como PDF, contactos del rider y anexos (stage plots).
//
// Correr ANTES del push: los campos entran al modelo Prisma y cualquier lectura
// sin `select` explícito pide esas columnas; sin ellas truena con 500.
//
// Columnas en camelCase citado, no snake_case: los modelos no llevan @map.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.prod.backup" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // ── 1. ArtistaRider: contexto y origen ─────────────────────────────────────
  await sql`ALTER TABLE artista_riders ADD COLUMN IF NOT EXISTS contexto text NOT NULL DEFAULT 'GENERAL'`;
  await sql`ALTER TABLE artista_riders ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'GENERADO'`;
  await sql`ALTER TABLE artista_riders ADD COLUMN IF NOT EXISTS "archivoUrl" text`;
  await sql`ALTER TABLE artista_riders ADD COLUMN IF NOT EXISTS "archivoNombre" text`;
  await sql`ALTER TABLE artista_riders ADD COLUMN IF NOT EXISTS "archivoTamanoBytes" integer`;
  await sql`CREATE INDEX IF NOT EXISTS "artista_riders_artistaId_contexto_idx" ON artista_riders("artistaId", contexto)`;

  // ── 2. ArtistaRiderContacto ────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS artista_rider_contactos (
      id          text PRIMARY KEY,
      "riderId"   text NOT NULL,
      "personaId" text,
      nombre      text NOT NULL,
      rol         text NOT NULL,
      telefono    text,
      email       text,
      notas       text,
      "enPdf"     boolean NOT NULL DEFAULT true,
      orden       integer NOT NULL DEFAULT 0,
      "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "artista_rider_contactos_riderId_idx" ON artista_rider_contactos("riderId")`;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artista_rider_contactos_riderId_fkey') THEN
        ALTER TABLE artista_rider_contactos ADD CONSTRAINT "artista_rider_contactos_riderId_fkey"
          FOREIGN KEY ("riderId") REFERENCES artista_riders(id) ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artista_rider_contactos_personaId_fkey') THEN
        ALTER TABLE artista_rider_contactos ADD CONSTRAINT "artista_rider_contactos_personaId_fkey"
          FOREIGN KEY ("personaId") REFERENCES artista_personas(id) ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$
  `;

  // ── 3. ArtistaRiderArchivo ─────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS artista_rider_archivos (
      id             text PRIMARY KEY,
      "riderId"      text NOT NULL,
      nombre         text NOT NULL,
      url            text NOT NULL,
      tipo           text NOT NULL DEFAULT 'STAGE_PLOT',
      mime           text,
      "tamanoBytes"  integer,
      "incluirEnPdf" boolean NOT NULL DEFAULT true,
      notas          text,
      orden          integer NOT NULL DEFAULT 0,
      "createdAt"    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    timestamp(3) NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "artista_rider_archivos_riderId_idx" ON artista_rider_archivos("riderId")`;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artista_rider_archivos_riderId_fkey') THEN
        ALTER TABLE artista_rider_archivos ADD CONSTRAINT "artista_rider_archivos_riderId_fkey"
          FOREIGN KEY ("riderId") REFERENCES artista_riders(id) ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$
  `;

  // ── 4. El stagePlotUrl que ya estaba capturado se vuelve un anexo ──────────
  // Era un campo de texto suelto; ahora los planos viven en la tabla de anexos y
  // de ahí los toma el PDF. Se migra el que haya para no perderlo de vista.
  const migrados = await sql`
    INSERT INTO artista_rider_archivos (id, "riderId", nombre, url, tipo, orden, "createdAt", "updatedAt")
    SELECT
      'arch_' || r.id,
      r.id,
      'Stage plot',
      r."stagePlotUrl",
      'STAGE_PLOT',
      0,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM artista_riders r
    WHERE r."stagePlotUrl" IS NOT NULL
      AND r."stagePlotUrl" <> ''
      AND NOT EXISTS (SELECT 1 FROM artista_rider_archivos a WHERE a."riderId" = r.id)
    RETURNING id
  `;

  // ── Verificación ───────────────────────────────────────────────────────────
  const cols = await sql`
    select column_name from information_schema.columns
    where table_name = 'artista_riders'
      and column_name in ('contexto','origen','archivoUrl','archivoNombre','archivoTamanoBytes')
    order by column_name
  `;
  const contactos = await sql`
    select column_name from information_schema.columns
    where table_name = 'artista_rider_contactos' order by ordinal_position
  `;
  const archivos = await sql`
    select column_name from information_schema.columns
    where table_name = 'artista_rider_archivos' order by ordinal_position
  `;
  const fks = await sql`
    select conname from pg_constraint
    where conname in ('artista_rider_contactos_riderId_fkey','artista_rider_contactos_personaId_fkey',
                      'artista_rider_archivos_riderId_fkey')
    order by conname
  `;

  console.log("artista_riders:", cols.map((c: any) => c.column_name).join(", "));
  console.log("artista_rider_contactos:", contactos.map((c: any) => c.column_name).join(", "));
  console.log("artista_rider_archivos:", archivos.map((c: any) => c.column_name).join(", "));
  console.log("FKs:", fks.map((c: any) => c.conname).join(", "));
  console.log("stage plots migrados a anexos:", migrados.length);
}

main();
