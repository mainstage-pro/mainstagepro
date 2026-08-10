import { neon } from "@neondatabase/serverless";

// Migración lazy idempotente para columnas del hub de tareas que pueden no
// existir todavía en la BD de producción (Neon). Se ejecuta una vez por instancia.
//
// IMPORTANTE: el DDL se aplica con el driver HTTP de Neon (`neon()`), NO con el
// pooler de Prisma (`prisma.$executeRawUnsafe`). El pooler de transacciones de
// Neon no aplica DDL de forma fiable ni desde local ni desde el runtime de
// Vercel; agregar una columna al schema y confiar en el pooler dejó columnas sin
// crear y tumbó rutas de lectura en prod. El endpoint HTTP de Neon sí funciona.
let ensured = false;

const DDL = [
  `ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "proyectoEventoId" TEXT`,
  `ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "evidenciaEnviadaAt" TIMESTAMP(3)`,
  `ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "evidenciaEnviadaPorId" TEXT`,
  `ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "evidenciaEnviadaCanal" TEXT`,
  `ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "tratoId" TEXT`,
  `ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "clienteId" TEXT`,
  `ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "enBandeja" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "noRealizada" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "motivoNoRealizada" TEXT`,
  `ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "justificacionNoRealizada" TEXT`,
  `ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "evidenciasHistorial" TEXT`,
  `CREATE INDEX IF NOT EXISTS "tareas_proyectoEventoId_idx" ON "tareas"("proyectoEventoId")`,
  `CREATE INDEX IF NOT EXISTS "tareas_tratoId_idx" ON "tareas"("tratoId")`,
  `CREATE INDEX IF NOT EXISTS "tareas_clienteId_idx" ON "tareas"("clienteId")`,
  `CREATE INDEX IF NOT EXISTS "tareas_enBandeja_idx" ON "tareas"("enBandeja")`,
];

export async function ensureTareaColumns(): Promise<void> {
  if (ensured) return;
  const raw = process.env.DATABASE_URL;
  if (!raw) return;
  // El driver HTTP de Neon no acepta los parámetros del pooler.
  const url = raw
    .replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");
  try {
    const sql = neon(url);
    for (const stmt of DDL) {
      await sql.query(stmt);
    }
    ensured = true;
  } catch {
    // Silencioso: si falla (permisos, red, etc.) las rutas siguen operando sobre
    // las columnas ya existentes. No debe tumbar el request.
  }
}
