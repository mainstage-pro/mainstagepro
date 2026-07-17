import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf-8");
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
const sql = neon(match[1]);

const term = process.argv[2] || "supraterra";
const like = "%" + term + "%";

console.log(`\n=== TRATOS que coinciden con "${term}" (por nombreEvento o cliente) ===`);
const tratos = await sql`
  SELECT t.id, t."nombreEvento", c.nombre AS cliente, t."fechaEventoEstimada",
         t."fechasEvento", t."diasServicio", t."horaInicioEvento", t."horaFinEvento",
         t.etapa, t."confirmadaEn"
  FROM tratos t
  JOIN clientes c ON c.id = t."clienteId"
  WHERE t."nombreEvento" ILIKE ${like} OR c.nombre ILIKE ${like}
  ORDER BY t."fechaEventoEstimada" DESC NULLS LAST
`;
tratos.forEach(t => {
  console.log(`\n  TRATO ${t.id}`);
  console.log(`    nombreEvento: ${t.nombreEvento}   cliente: ${t.cliente}`);
  console.log(`    fechaEventoEstimada: ${t.fechaEventoEstimada}`);
  console.log(`    fechasEvento: ${t.fechasEvento}`);
  console.log(`    diasServicio: ${t.diasServicio}  etapa: ${t.etapa}  confirmadaEn: ${t.confirmadaEn}`);
});

console.log(`\n=== COTIZACIONES ligadas a esos tratos ===`);
for (const t of tratos) {
  const cots = await sql`
    SELECT id, "numeroCotizacion", nombre_cotizacion AS "nombreCotizacion", "nombreEvento", estado, "fechaEvento",
           "diasEquipo", "diasOperacion", "diasTransporte", "diasHospedaje", "diasComidas",
           "descuentoMultidiaPct"
    FROM cotizaciones
    WHERE "tratoId" = ${t.id}
    ORDER BY "createdAt" DESC
  `;
  cots.forEach(c => {
    console.log(`\n  COTIZACION ${c.id} (${c.numeroCotizacion}) trato=${t.id}`);
    console.log(`    nombreCotizacion: ${c.nombreCotizacion}  nombreEvento: ${c.nombreEvento}  estado: ${c.estado}`);
    console.log(`    fechaEvento: ${c.fechaEvento}`);
    console.log(`    dias -> equipo:${c.diasEquipo} operacion:${c.diasOperacion} transporte:${c.diasTransporte} hospedaje:${c.diasHospedaje} comidas:${c.diasComidas}`);
    console.log(`    descuentoMultidiaPct: ${c.descuentoMultidiaPct}`);
  });
}

console.log(`\n=== PROYECTOS ligados a esos tratos ===`);
for (const t of tratos) {
  const proys = await sql`
    SELECT id, nombre, "fechaEvento", "fechasEvento", "horariosEvento",
           "horaInicioEvento", "horaFinEvento", "cotizacionId", estado
    FROM proyectos
    WHERE "tratoId" = ${t.id}
    ORDER BY "createdAt" DESC
  `;
  proys.forEach(p => {
    console.log(`\n  PROYECTO ${p.id} trato=${t.id}`);
    console.log(`    nombre: ${p.nombre}  estado: ${p.estado}  cotizacionId: ${p.cotizacionId}`);
    console.log(`    fechaEvento: ${p.fechaEvento}`);
    console.log(`    fechasEvento: ${p.fechasEvento}`);
    console.log(`    horariosEvento: ${p.horariosEvento}`);
  });
}

console.log("\n--- fin ---\n");
