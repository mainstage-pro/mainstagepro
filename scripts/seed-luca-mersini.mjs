// One-shot seed: Proyecto Luca Mersini - 23 de Mayo 2026
// Run: node scripts/seed-luca-mersini.mjs

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { randomBytes } from "crypto";

// Load .env manually
const env = readFileSync(new URL("../.env", import.meta.url), "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const sql = neon(process.env.DATABASE_URL);

function cuid() {
  return "c" + randomBytes(11).toString("base64url").slice(0, 24);
}

// ── 1. Find Mauricio ──────────────────────────────────────────────────────────
const [mauricio] = await sql`
  SELECT id, name FROM users
  WHERE email ILIKE '%mainstageqro%' OR name ILIKE '%Mauricio%'
  LIMIT 1
`;
if (!mauricio) throw new Error("No se encontró el usuario Mauricio");
console.log("Usuario:", mauricio.name, mauricio.id);

// ── 2. Cliente ────────────────────────────────────────────────────────────────
const clienteId = cuid();
await sql`
  INSERT INTO clientes (id, nombre, empresa, "tipoCliente", clasificacion, telefono, "servicioUsual", "createdAt", "updatedAt")
  VALUES (
    ${clienteId}, 'Luca Mersini', 'PARTICULAR', 'B2C', 'NUEVO',
    '4428642809', 'PRODUCCION_TECNICA', NOW(), NOW()
  )
`;
console.log("✓ Cliente creado:", clienteId);

// ── 3. Trato ──────────────────────────────────────────────────────────────────
const tratoId = cuid();
await sql`
  INSERT INTO tratos (
    id, "clienteId", "responsableId", "tipoEvento", "tipoServicio",
    "tipoLead", "origenLead", "origenVenta", etapa, clasificacion,
    "estatusContacto", "rutaEntrada", "tipoProspecto",
    "nombreEvento", "lugarEstimado", "fechaEventoEstimada", notas,
    "descubrimientoCompleto", "tradeCalificado", "familyAndFriends",
    "realizarRender", "formEstado", "createdAt", "updatedAt"
  )
  VALUES (
    ${tratoId}, ${clienteId}, ${mauricio.id}, 'MUSICAL', 'PRODUCCION_TECNICA',
    'INBOUND', 'ORGANICO', 'CLIENTE_PROPIO', 'OPORTUNIDAD', 'PROSPECTO',
    'CONTACTADO', 'DESCUBRIR', 'ACTIVO',
    'Presentación en Vivo Luca Mersini', 'Colegio Álamos', '2026-05-23',
    'Escenario 10x7.5m · 3 stages pequeños para cantante y músicos · Smpte para inicio y fin del show · Microfoneo piano y batería (pendiente) · Micrófono para hablar · Salida de computadora/interface · Pantalla LED 6x2m',
    false, false, false, false, 'NO_ENVIADO', NOW(), NOW()
  )
`;
console.log("✓ Trato creado:", tratoId);

// ── 4. Número de cotización ───────────────────────────────────────────────────
const [lastCot] = await sql`
  SELECT "numeroCotizacion" FROM cotizaciones ORDER BY "numeroCotizacion" DESC LIMIT 1
`;
const lastNum = lastCot ? parseInt(lastCot.numeroCotizacion.replace("COT-", "")) || 0 : 0;
const numeroCotizacion = `COT-${String(lastNum + 1).padStart(4, "0")}`;
console.log("Número cotización:", numeroCotizacion);

// ── 5. Cotización ─────────────────────────────────────────────────────────────
const cotId = cuid();
await sql`
  INSERT INTO cotizaciones (
    id, "numeroCotizacion", version, opcion_letra,
    "tratoId", "clienteId", "creadaPorId",
    estado, "nombreEvento", "tipoEvento", "tipoServicio",
    "fechaEvento", "lugarEvento",
    "diasEquipo", "diasOperacion", "diasTransporte", "diasHospedaje", "diasComidas",
    "subtotalEquiposBruto", "descuentoVolumenPct", "descuentoB2bPct",
    "descuentoMultidiaPct", "descuentoPatrocinioPct", "descuentoEspecialPct",
    "descuentoFamilyFriendsPct", "descuentoTotalPct",
    "montoDescuento", "subtotalEquiposNeto", "subtotalPaquetes",
    "subtotalTerceros", "subtotalOperacion", "subtotalTransporte",
    "subtotalComidas", "subtotalHospedaje", total,
    "aplicaIva", "montoIva", "granTotal",
    "tipoBeneficio", "montoBeneficio",
    "costosTotalesEstimados", "utilidadEstimada", "porcentajeUtilidad",
    "vigenciaDias", observaciones, "incluirChofer",
    "createdAt", "updatedAt"
  )
  VALUES (
    ${cotId}, ${numeroCotizacion}, 1, 'A',
    ${tratoId}, ${clienteId}, ${mauricio.id},
    'BORRADOR', 'Presentación en Vivo Luca Mersini', 'MUSICAL', 'PRODUCCION_TECNICA',
    '2026-05-23', 'Colegio Álamos',
    1, 1, 1, 1, 1,
    79900, 19.8, 0,
    0, 0, 0,
    0, 19.8,
    27965, 79900, 0,
    29800, 17500, 0,
    3900, 0, 141100,
    true, 18101.60, 131236.60,
    'DESCUENTO_DIRECTO', 27965,
    51200, 61935, 54.74,
    30, 'Cotización elaborada el 20/02/2026. Anticipo sugerido: $22,627 (20% del gran total). Beneficio/descuento de $27,965 puede aplicarse como descuento directo o saldo a favor para ampliar producción.', false,
    NOW(), NOW()
  )
`;
console.log("✓ Cotización creada:", cotId);

// ── 6. Líneas ─────────────────────────────────────────────────────────────────
const lineas = [
  // EQUIPO DE AUDIO
  { tipo: "EQUIPO_PROPIO",     desc: "Bocina line array activa RCF HDL 6A",                  qty: 12, pu: 1000,  st: 12000, inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Subwoofer activo RCF SUB 8006 AS",                     qty: 3,  pu: 3000,  st: 9000,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Marco de colgado (flybar) RCF HDL6A",                  qty: 2,  pu: 0,     st: 0,     inc: true  },
  { tipo: "EQUIPO_PROPIO",     desc: "Bocina activa full range Electro Voice EKX 12P",       qty: 3,  pu: 1000,  st: 3000,  inc: false },
  // MICROFONÍA
  { tipo: "EQUIPO_PROPIO",     desc: "Micrófono inalámbrico digital Shure SLXD B58",         qty: 2,  pu: 500,   st: 1000,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Distribución inalámbrica Shure",                       qty: 1,  pu: 0,     st: 0,     inc: true  },
  { tipo: "EQUIPO_PROPIO",     desc: "Set de cableado de señal (microfonía)",                qty: 1,  pu: 0,     st: 0,     inc: true  },
  { tipo: "EQUIPO_PROPIO",     desc: "Set de baterías recargables (microfonía)",              qty: 1,  pu: 0,     st: 0,     inc: true  },
  // MONITOREO IN EAR
  { tipo: "EQUIPO_PROPIO",     desc: "Sistema in-ear Sennheiser IEM G4 (Trans + Bodypack)",  qty: 2,  pu: 500,   st: 1000,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Audífonos in-ear Sennheiser IE4",                      qty: 2,  pu: 0,     st: 0,     inc: true  },
  { tipo: "EQUIPO_PROPIO",     desc: "Set de baterías recargables (IEMs)",                   qty: 1,  pu: 0,     st: 0,     inc: true  },
  // CONSOLAS DE AUDIO
  { tipo: "EQUIPO_PROPIO",     desc: "Consola digital Allen & Heath SQ5",                    qty: 1,  pu: 2000,  st: 2000,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Stagebox / expansor Allen & Heath AR24/12",            qty: 1,  pu: 1500,  st: 1500,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Set de cableado de señal (consolas)",                  qty: 1,  pu: 0,     st: 0,     inc: true  },
  // ILUMINACIÓN
  { tipo: "EQUIPO_PROPIO",     desc: "Cabeza móvil tipo beam Lite Tek BEAM 280",             qty: 12, pu: 500,   st: 6000,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Efecto de iluminación Sun Star KALEIDOS",              qty: 8,  pu: 500,   st: 4000,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Luminaria led RGBW Sun Star SOUL RGBW",               qty: 8,  pu: 500,   st: 4000,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Luz estroboscópica Lite Tek FLASHER 200",             qty: 12, pu: 250,   st: 3000,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Luz tipo blinder Lite Tek BLINDER 200",               qty: 8,  pu: 250,   st: 2000,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Seguidores tipo followspot",                           qty: 2,  pu: 1000,  st: 2000,  inc: false },
  // CONSOLAS DE ILUMINACIÓN
  { tipo: "EQUIPO_PROPIO",     desc: "Controlador/wing de iluminación MA Command Wing",      qty: 1,  pu: 1500,  st: 1500,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Nodo de red DMX (8 universos)",                       qty: 1,  pu: 0,     st: 0,     inc: true  },
  { tipo: "EQUIPO_PROPIO",     desc: "Splitter DMX 4 canales",                              qty: 1,  pu: 0,     st: 0,     inc: true  },
  { tipo: "EQUIPO_PROPIO",     desc: "Computadora para operación de iluminación",            qty: 1,  pu: 0,     st: 0,     inc: true  },
  { tipo: "EQUIPO_PROPIO",     desc: "Máquina de haze (fazer) Lite Tek Fazer 1500",         qty: 2,  pu: 1000,  st: 2000,  inc: false },
  // RIGGING Y ESTRUCTURAS
  { tipo: "EQUIPO_PROPIO",     desc: "Torre de truss 2.5M con base y tubo",                 qty: 8,  pu: 0,     st: 0,     inc: true  },
  { tipo: "EQUIPO_PROPIO",     desc: "Elevadores de audio 6 metros de altura máxima",       qty: 2,  pu: 1000,  st: 2000,  inc: false },
  // PANTALLA/VIDEO
  { tipo: "EQUIPO_PROPIO",     desc: "Pantalla LED pitch 3.9mm 6x2m a 1m de altura",        qty: 1,  pu: 12000, st: 12000, inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Procesador de video LED Novastar",                    qty: 1,  pu: 0,     st: 0,     inc: true  },
  { tipo: "EQUIPO_PROPIO",     desc: "Computadora para operación de video",                 qty: 1,  pu: 0,     st: 0,     inc: true  },
  { tipo: "EQUIPO_PROPIO",     desc: "Escuadras para montaje pantalla LED (4 pzas)",        qty: 4,  pu: 0,     st: 0,     inc: true  },
  { tipo: "EQUIPO_PROPIO",     desc: "Set de cableado HDMI necesario",                      qty: 1,  pu: 0,     st: 0,     inc: true  },
  // ENTARIMADO
  { tipo: "EQUIPO_PROPIO",     desc: "Tarima 10x7.5 metros a 80cm de altura",               qty: 1,  pu: 9500,  st: 9500,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Tarima 2.5x2.5 metros a 30cm de altura",              qty: 3,  pu: 800,   st: 2400,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Tarima 6.25x1.25m a 1m de altura para pantalla",      qty: 1,  pu: 0,     st: 0,     inc: true  },
  // CORRIENTE ELÉCTRICA
  { tipo: "EQUIPO_PROPIO",     desc: "Generador de luz 60KW por 8 horas",                   qty: 1,  pu: 7000,  st: 7000,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Centro de carga Lite Tek 63A por fase (3 fases)",     qty: 1,  pu: 3000,  st: 3000,  inc: false },
  { tipo: "EQUIPO_PROPIO",     desc: "Cable de potencia calibre 6, 30m de largo",           qty: 1,  pu: 0,     st: 0,     inc: true  },
  // EQUIPOS ADICIONALES (TERCEROS)
  { tipo: "EQUIPO_EXTERNO",    desc: "Ground Support 12m x 7m x 6m",                        qty: 1,  pu: 25000, st: 25000, inc: false, ext: true },
  { tipo: "EQUIPO_EXTERNO",    desc: "Bidones de agua",                                     qty: 2,  pu: 1500,  st: 3000,  inc: false, ext: true },
  { tipo: "EQUIPO_EXTERNO",    desc: "Pipa de agua",                                        qty: 1,  pu: 1800,  st: 1800,  inc: false, ext: true },
  // OPERACIÓN TÉCNICA
  { tipo: "OPERACION_TECNICA", desc: "Ingeniero de Sala",                                   qty: 1,  pu: 2500,  st: 2500,  inc: false },
  { tipo: "OPERACION_TECNICA", desc: "Técnico de Audio",                                    qty: 1,  pu: 1000,  st: 1000,  inc: false },
  { tipo: "OPERACION_TECNICA", desc: "Stagehand/Staff Audio",                               qty: 4,  pu: 1000,  st: 4000,  inc: false },
  { tipo: "OPERACION_TECNICA", desc: "Ingeniero de Iluminación",                            qty: 1,  pu: 2500,  st: 2500,  inc: false },
  { tipo: "OPERACION_TECNICA", desc: "Stagehand/Staff Iluminación",                         qty: 4,  pu: 1000,  st: 4000,  inc: false },
  { tipo: "OPERACION_TECNICA", desc: "Operador de Video",                                   qty: 1,  pu: 1500,  st: 1500,  inc: false },
  { tipo: "OPERACION_TECNICA", desc: "Stagehand/Staff Video",                               qty: 2,  pu: 1000,  st: 2000,  inc: false },
  // COMIDAS
  { tipo: "COMIDA",             desc: "Comidas personal técnico (20 raciones)",              qty: 20, pu: 130,   st: 3900,  inc: false },
];

for (let i = 0; i < lineas.length; i++) {
  const l = lineas[i];
  const linId = cuid();
  await sql`
    INSERT INTO cotizacion_lineas (
      id, "cotizacionId", tipo, orden,
      descripcion, "esExterno",
      cantidad, dias, "precioUnitario", "costoUnitario", subtotal,
      "esIncluido"
    )
    VALUES (
      ${linId}, ${cotId}, ${l.tipo}, ${i},
      ${l.desc}, ${l.ext ?? false},
      ${l.qty}, 1, ${l.pu}, 0, ${l.st},
      ${l.inc}
    )
  `;
}
console.log(`✓ ${lineas.length} líneas insertadas`);

console.log(`\n✅ Registro completado:`);
console.log(`   Cliente:    Luca Mersini (${clienteId})`);
console.log(`   Trato:      ${tratoId}`);
console.log(`   Cotización: ${numeroCotizacion} (${cotId})`);
console.log(`   Gran total: $131,236.60 MXN (precio preferencial sin IVA: $113,135)`);
console.log(`\n   Ve a /ventas/tratos para ver el trato`);
