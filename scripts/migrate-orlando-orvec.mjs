/**
 * Migración: COT-0006 Renta de equipo de audio — Orlando Orvec
 * Usa @neondatabase/serverless (HTTP) para evitar problemas de TCP.
 * Ejecutar: node scripts/migrate-orlando-orvec.mjs
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dir, "../.env"), "utf-8");
const match = envContent.match(/^DATABASE_URL="?([^"\n]+)"?/m);
if (!match) throw new Error("DATABASE_URL no encontrada en .env");

const sql = neon(match[1]);

function cuid() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 12);
  return `c${ts}${rand}`;
}

async function main() {
  console.log("🚀 Iniciando migración COT-0006 Orlando Orvec...\n");

  // 1. Vendedor
  const [vendedor] = await sql`
    SELECT id, name FROM users WHERE LOWER(name) LIKE '%mauricio%' LIMIT 1
  `;
  if (!vendedor) throw new Error("No se encontró usuario Mauricio.");
  console.log(`✅ Vendedor: ${vendedor.name} (${vendedor.id})`);

  // 2. Cliente
  const [cliente] = await sql`
    SELECT id, nombre FROM clientes WHERE LOWER(nombre) LIKE '%orlando%' LIMIT 1
  `;
  if (!cliente) throw new Error("No se encontró cliente Orlando Orvec.");
  console.log(`✅ Cliente: ${cliente.nombre} (${cliente.id})`);

  // 3. Trato existente
  const [trato] = await sql`
    SELECT id, "nombreEvento", etapa FROM tratos
    WHERE "clienteId" = ${cliente.id}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;
  if (!trato) throw new Error("No se encontró trato para Orlando Orvec.");
  console.log(`✅ Trato: ${trato.nombreEvento ?? trato.id} — ${trato.etapa} (${trato.id})`);

  // 4. Número de cotización
  const [lastCot] = await sql`
    SELECT "numeroCotizacion" FROM cotizaciones ORDER BY "numeroCotizacion" DESC LIMIT 1
  `;
  const lastNum = lastCot
    ? parseInt(lastCot.numeroCotizacion.replace("COT-", "")) || 0
    : 0;
  const numeroCotizacion = `COT-${String(lastNum + 1).padStart(4, "0")}`;
  console.log(`   Número: ${numeroCotizacion}`);

  // 5. Crear cotización
  const cotId = cuid();
  const now = new Date().toISOString();
  const fechaEvento = "2026-05-02T12:00:00.000Z";

  await sql`
    INSERT INTO cotizaciones (
      id, "numeroCotizacion", version, "opcion_letra",
      "tratoId", "clienteId", "creadaPorId", estado,
      "nombreEvento", "tipoEvento", "tipoServicio",
      "fechaEvento", "lugarEvento",
      "diasEquipo", "diasOperacion", "diasTransporte", "diasComidas", "diasHospedaje",
      "aplicaIva", "vigenciaDias", "tipoBeneficio",
      "subtotalEquiposBruto",
      "descuentoVolumenPct", "descuentoB2bPct", "descuentoMultidiaPct",
      "descuentoPatrocinioPct", "descuentoEspecialPct", "descuentoTotalPct",
      "montoDescuento", "montoBeneficio",
      "subtotalEquiposNeto", "subtotalPaquetes", "subtotalTerceros",
      "subtotalOperacion", "subtotalTransporte", "subtotalComidas", "subtotalHospedaje",
      total, "montoIva", "granTotal",
      "costosTotalesEstimados", "utilidadEstimada", "porcentajeUtilidad",
      "createdAt", "updatedAt"
    ) VALUES (
      ${cotId}, ${numeroCotizacion}, 1, 'A',
      ${trato.id}, ${cliente.id}, ${vendedor.id}, 'BORRADOR',
      'Renta de equipo de audio', 'MUSICAL', 'RENTA',
      ${fechaEvento}, 'Querétaro',
      1, 1, 1, 1, 1,
      false, 30, 'DESCUENTO',
      7750,
      0, 0, 0,
      0, 0, 0,
      0, 0,
      7750, 0, 0,
      0, 0, 0, 0,
      7750, 0, 7750,
      0, 7750, 1.0,
      ${now}, ${now}
    )
  `;

  // 6. Líneas
  const lineas = [
    { descripcion: "Bocina activa tipo full range Electro Voice EKX 12P", marca: "Electro Voice", cantidad: 4, precioUnitario: 1000, subtotal: 4000 },
    { descripcion: "Subwoofer activo Electro Voice EKX 18P",             marca: "Electro Voice", cantidad: 3, precioUnitario: 1250, subtotal: 3750 },
  ];

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    await sql`
      INSERT INTO cotizacion_lineas (
        id, "cotizacionId", tipo, orden,
        descripcion, marca, nivel,
        cantidad, dias, "precioUnitario", "costoUnitario", subtotal,
        "esIncluido", "esExterno",
        "createdAt", "updatedAt"
      ) VALUES (
        ${cuid()}, ${cotId}, 'EQUIPO_PROPIO', ${i},
        ${l.descripcion}, ${l.marca}, null,
        ${l.cantidad}, 1, ${l.precioUnitario}, 0, ${l.subtotal},
        false, false,
        ${now}, ${now}
      )
    `;
  }

  console.log(`\n✅ Cotización creada: ${numeroCotizacion} (${cotId})`);
  console.log(`   Líneas: ${lineas.length}`);
  console.log(`   Gran Total: $7,750`);
  console.log(`\n🔗 Trato:      /crm/tratos/${trato.id}`);
  console.log(`🔗 Cotización: /cotizaciones/${cotId}`);
  console.log("\n✔  Migración completada.");
}

main().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
