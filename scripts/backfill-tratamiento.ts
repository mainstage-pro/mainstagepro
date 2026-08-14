import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { proponerTratamiento } from "../src/lib/diseno/tratamiento";

// Propone `tratamiento` por canal alfa para equipos que aún no lo tienen.
// Idempotente: solo toca filas con tratamiento NULL. El usuario luego corrige.
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function bytesDe(img: string): Promise<Buffer | null> {
  try {
    if (img.startsWith("data:")) {
      const b64 = img.slice(img.indexOf(",") + 1);
      return Buffer.from(b64, "base64");
    }
    if (img.startsWith("http")) {
      const r = await fetch(img);
      if (!r.ok) return null;
      return Buffer.from(await r.arrayBuffer());
    }
    if (img.startsWith("/")) {
      return await readFile(path.join(process.cwd(), "public", img.replace(/^\//, "")));
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const rows = (await sql.query(
    `SELECT id, "imagenUrl" img FROM equipos WHERE activo = true AND tratamiento IS NULL AND "imagenUrl" IS NOT NULL AND "imagenUrl" <> ''`
  )) as { id: string; img: string }[];
  console.log(`Equipos por clasificar: ${rows.length}`);
  let png = 0, foto = 0, sin = 0;
  for (const r of rows) {
    const buf = await bytesDe(r.img);
    if (!buf) { sin++; continue; }
    let t: string;
    try { t = await proponerTratamiento(buf); } catch { sin++; continue; }
    await sql.query(`UPDATE equipos SET tratamiento = $1 WHERE id = $2`, [t, r.id]);
    if (t === "png-transparente") png++; else foto++;
  }
  console.log(`Propuestos → png-transparente: ${png}, foto-marco: ${foto}, sin resolver: ${sin}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
