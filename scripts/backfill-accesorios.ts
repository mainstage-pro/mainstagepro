import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

// Promueve cada EquipoAccesorio (biblioteca legacy) a un Accesorio de primera clase
// y enlaza la fila puente. Idempotente: solo toca filas puente sin accesorioId.
async function main() {
  const pendientes = await sql.query(
    `SELECT id, nombre FROM equipo_accesorios WHERE "accesorioId" IS NULL`
  );
  console.log(`Filas puente sin Accesorio: ${pendientes.length}`);

  let creados = 0;
  for (const ea of pendientes as any[]) {
    const accId = randomUUID();
    await sql.query(
      `INSERT INTO accesorios (id, nombre, "tipoConteo", estado, activo, "createdAt", "updatedAt")
       VALUES ($1, $2, 'default', 'activo', true, now(), now())`,
      [accId, ea.nombre]
    );
    await sql.query(`UPDATE equipo_accesorios SET "accesorioId" = $1 WHERE id = $2`, [accId, ea.id]);
    creados++;
  }

  const total = await sql.query(`SELECT count(*)::int AS n FROM accesorios`);
  console.log(`Accesorios creados: ${creados}. Total en catálogo: ${(total as any[])[0].n}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
