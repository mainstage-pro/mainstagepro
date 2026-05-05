import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf-8");
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
const sql = neon(match[1]);

const hoyCST = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
console.log("Hoy CST:", hoyCST);

// Totales por área y estado
const areas = await sql`
  SELECT area, estado, COUNT(*) as total
  FROM tareas
  WHERE "parentId" IS NULL
  GROUP BY area, estado
  ORDER BY area, estado
`;
console.log("\nTareas por área/estado:");
areas.forEach(r => console.log(" ", r.area.padEnd(16), r.estado.padEnd(12), r.total));

// Tareas con fecha = hoy
const hoyDate = new Date(hoyCST + "T00:00:00.000Z");
const manana  = new Date(hoyCST + "T00:00:00.000Z");
manana.setUTCDate(manana.getUTCDate() + 1);
console.log("\nRango:", hoyDate.toISOString(), "->", manana.toISOString());

const tareasHoy = await sql`
  SELECT area, estado, fecha, titulo
  FROM tareas
  WHERE "parentId" IS NULL
    AND fecha >= ${hoyDate} AND fecha < ${manana}
  LIMIT 20
`;
console.log("\nTareas con fecha = hoy:", tareasHoy.length);
tareasHoy.forEach(r => console.log(" ", r.area, "|", r.estado, "|", r.fecha, "|", r.titulo));

// Muestra de tareas sin fecha
const sinFecha = await sql`
  SELECT area, estado, titulo
  FROM tareas
  WHERE "parentId" IS NULL AND fecha IS NULL AND "fechaVencimiento" IS NULL
    AND estado NOT IN ('COMPLETADA','CANCELADA')
  LIMIT 5
`;
console.log("\nMuestra sin fecha ni vencimiento:", sinFecha.length);
sinFecha.forEach(r => console.log(" ", r.area, "|", r.titulo));

// Áreas de usuarios activos
const users = await sql`SELECT id, name, area FROM users WHERE active = true ORDER BY name`;
console.log("\nUsuarios y sus áreas:");
users.forEach(u => console.log(" ", u.name.padEnd(25), u.area));
