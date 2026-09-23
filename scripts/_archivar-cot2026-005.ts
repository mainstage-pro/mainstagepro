import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "fs";

const envFile = process.env.ENV_FILE || ".env.prod.backup";
const envRaw = readFileSync(envFile, "utf8");
const match = envRaw.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error(`No DATABASE_URL en ${envFile}`);
const raw = match[1].trim().replace(/^["']|["']$/g, "");
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const COT_ID = "cmsnqadtc0001avvhnvvhquhx"; // COT-2026-005, BORRADOR huérfana, mismo trato que COT-2100 (la real)

(async () => {
  const antes = (await sql.query(`SELECT id, "numeroCotizacion", estado, observaciones, "tratoId" FROM cotizaciones WHERE id=$1`, [COT_ID]))[0] as any;
  if (!antes) throw new Error("No encontrada");
  if (antes.estado !== "BORRADOR") throw new Error(`Estado inesperado: ${antes.estado}`);

  // Verificar que sigue sin proyecto (no se debe rechazar una cotización con proyecto)
  const proy = await sql.query(`SELECT id FROM proyectos WHERE "cotizacionId" = $1`, [COT_ID]);
  if (proy.length > 0) throw new Error("Esta cotización ya tiene proyecto — no tocar");

  writeFileSync(
    `scripts/_backup-archivar-cot2026-005-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    JSON.stringify(antes, null, 2)
  );

  const nuevaObs = [antes.observaciones, "Rechazada/archivada 2026-09-22: borrador paralelo abandonado del mismo trato que COT-2100 (la cotización real que se aprobó y se convirtió en PRY-2026-082 Lazy Sunday). Nunca se envió ni se ligó a proyecto."]
    .filter(Boolean).join("\n\n");

  await sql.query(`UPDATE cotizaciones SET estado='RECHAZADA', observaciones=$1, "updatedAt"=now() WHERE id=$2`, [nuevaObs, COT_ID]);
  console.log("COT-2026-005 marcada como RECHAZADA (borrador paralelo abandonado).");
})();
