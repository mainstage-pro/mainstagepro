import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const envRaw = readFileSync(".env.prod.backup", "utf8");
const m = envRaw.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m)!;
const url = m[1].replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

(async () => {
  // Buscar Lazy Sunday / yosoymatt primero
  const buscar = await sql.query(`
    SELECT c.id, c."numeroCotizacion", c."nombreEvento", p.id as "proyectoId", p."numeroProyecto", p.nombre
    FROM cotizaciones c
    LEFT JOIN proyectos p ON p."cotizacionId" = c.id
    WHERE c."nombreEvento" ILIKE '%lazy%' OR c."nombreEvento" ILIKE '%yosoymatt%' OR c."nombreEvento" ILIKE '%sunday%'
       OR p.nombre ILIKE '%lazy%' OR p.nombre ILIKE '%yosoymatt%' OR p.nombre ILIKE '%sunday%'
  `);
  console.log("=== BUSQUEDA LAZY SUNDAY / YOSOYMATT ===");
  console.log(JSON.stringify(buscar, null, 2));

  // Auditoría sistemática: cotizaciones CON proyecto que tienen líneas duplicadas
  // (misma firma de contenido apareciendo 2+ veces) — huella directa del bug de la carrera.
  const dup = await sql.query(`
    WITH firmas AS (
      SELECT "cotizacionId", tipo, descripcion, marca, modelo, nivel, jornada, cantidad, dias,
             "precioUnitario", "costoUnitario", subtotal, "equipoId", "rolTecnicoId", "proveedorId", notas,
             count(*) AS n
      FROM cotizacion_lineas
      GROUP BY "cotizacionId", tipo, descripcion, marca, modelo, nivel, jornada, cantidad, dias,
               "precioUnitario", "costoUnitario", subtotal, "equipoId", "rolTecnicoId", "proveedorId", notas
      HAVING count(*) > 1
    )
    SELECT f."cotizacionId", c."numeroCotizacion", c."nombreEvento", p.id as "proyectoId", p."numeroProyecto",
           count(*) AS grupos_duplicados, sum(f.n) AS lineas_en_grupos_duplicados
    FROM firmas f
    JOIN cotizaciones c ON c.id = f."cotizacionId"
    LEFT JOIN proyectos p ON p."cotizacionId" = c.id
    GROUP BY f."cotizacionId", c."numeroCotizacion", c."nombreEvento", p.id, p."numeroProyecto"
    ORDER BY grupos_duplicados DESC
  `);
  console.log("\n=== COTIZACIONES CON LINEAS DUPLICADAS (huella del bug) ===");
  console.log(JSON.stringify(dup, null, 2));
})();
