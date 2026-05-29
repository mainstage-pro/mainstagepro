// scripts/seed-cotizacion-boda.mjs
// Usa @neondatabase/serverless (HTTP) para evitar problemas de red con el pooler TCP
import { neon } from "@neondatabase/serverless";

const DB = "postgresql://neondb_owner:npg_0qjmIyDp6kHc@ep-noisy-firefly-an5vzlqv.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DB);

function cuid() {
  // simple cuid-like id for local generation
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function main() {
  console.log("🔍 Buscando cliente Juan Manuel Nava / Mouse...");

  // ─── 1. Buscar o crear cliente ────────────────────────────────────────────
  const [existing] = await sql`
    SELECT id, nombre, empresa, telefono FROM clientes
    WHERE nombre ILIKE '%Juan Manuel%' OR nombre ILIKE '%Nava%' OR nombre ILIKE '%Mouse%'
    LIMIT 1
  `;

  let clienteId;
  if (existing) {
    clienteId = existing.id;
    console.log(`✅ Cliente encontrado: ${existing.nombre} (${clienteId})`);
  } else {
    clienteId = cuid();
    await sql`
      INSERT INTO clientes (id, nombre, "tipoCliente", clasificacion, "servicioUsual", notas, "createdAt", "updatedAt")
      VALUES (${clienteId}, 'Juan Manuel Nava', 'B2C', 'REGULAR', 'RENTA', 'Alias: Mouse', now(), now())
    `;
    console.log(`➕ Cliente creado: Juan Manuel Nava (${clienteId})`);
  }

  // ─── 2. Buscar usuario admin ──────────────────────────────────────────────
  const [admin] = await sql`
    SELECT id, name FROM users WHERE email ILIKE '%mauricio%' LIMIT 1
  `;
  console.log(`👤 Admin: ${admin?.name ?? "N/A"} (${admin?.id ?? "N/A"})`);

  // ─── 3. Crear Trato ────────────────────────────────────────────────────────
  const tratoId = cuid();
  await sql`
    INSERT INTO tratos (
      id, "clienteId", "responsableId", "tipoEvento", "tipoServicio",
      etapa, clasificacion, "origenLead", "estatusContacto",
      "nombreEvento", "lugarEstimado", "fechaEventoEstimada",
      "asistentesEstimados", notas, "presupuestoEstimado",
      "tipoProspecto", "tipoLead", "descubrimientoCompleto",
      "tradeCalificado", "familyAndFriends", "realizarRender",
      "formEstado", "origenVenta",
      "createdAt", "updatedAt"
    ) VALUES (
      ${tratoId}, ${clienteId}, ${admin?.id ?? null}, 'SOCIAL', 'RENTA',
      'OPORTUNIDAD', 'REGULAR', 'ORGANICO', 'CONTACTADO',
      'Boda Juan Manuel Nava', 'Canto de Mar, Barra de Potosí, Guerrero',
      '2027-02-20 18:00:00+00',
      100, 'Cotización enviada. Boda social. 5 horas de servicio. 100 personas.', 71200,
      'ACTIVO', 'INBOUND', false,
      false, false, false,
      'NO_ENVIADO', 'CLIENTE_PROPIO',
      now(), now()
    )
  `;
  console.log(`✅ Trato creado: ${tratoId}`);

  // ─── 4. Buscar equipos en inventario ──────────────────────────────────────
  async function findEquipo(...terms) {
    for (const t of terms) {
      const [eq] = await sql`
        SELECT id, descripcion, marca, modelo, "precioRenta"
        FROM equipos
        WHERE activo = true AND (
          descripcion ILIKE ${"%" + t + "%"} OR
          modelo ILIKE ${"%" + t + "%"} OR
          marca ILIKE ${"%" + t + "%"}
        )
        LIMIT 1
      `;
      if (eq) return eq;
    }
    return null;
  }

  const eqEKX12   = await findEquipo("EKX 12", "EKX-12", "EKX12");
  const eqEKX18   = await findEquipo("EKX 18", "EKX-18", "EKX18");
  const eqCDJ     = await findEquipo("CDJ-3000", "CDJ 3000", "CDJ3000");
  const eqDJM     = await findEquipo("DJM-A9", "DJM A9", "DJMA9");
  const eqBeam    = await findEquipo("BEAM 280", "Lite Tek BEAM", "LiteTek BEAM");
  const eqPAR     = await findEquipo("PAR LED arq", "PAR arquitect", "PAR LED");
  const eqMA      = await findEquipo("Command Wing", "MA Wing", "MA Command");
  const eqShure   = await findEquipo("BLX24", "SM58", "Shure BLX");
  const eqMonitor = await findEquipo("Monitor", "Wedge");
  const eqPARWL   = await findEquipo("PAR inalámbrico", "PAR wireless", "PAR LED inalámbrico");

  console.log("  EKX-12P:          ", eqEKX12   ? `✅ ${eqEKX12.descripcion}`   : "❌");
  console.log("  EKX-18P:          ", eqEKX18   ? `✅ ${eqEKX18.descripcion}`   : "❌");
  console.log("  CDJ-3000:         ", eqCDJ     ? `✅ ${eqCDJ.descripcion}`     : "❌");
  console.log("  DJM-A9:           ", eqDJM     ? `✅ ${eqDJM.descripcion}`     : "❌");
  console.log("  BEAM 280:         ", eqBeam    ? `✅ ${eqBeam.descripcion}`    : "❌");
  console.log("  PAR LED arq:      ", eqPAR     ? `✅ ${eqPAR.descripcion}`     : "❌");
  console.log("  MA Command Wing:  ", eqMA      ? `✅ ${eqMA.descripcion}`      : "❌");
  console.log("  Shure BLX24:      ", eqShure   ? `✅ ${eqShure.descripcion}`   : "❌");
  console.log("  Monitor:          ", eqMonitor ? `✅ ${eqMonitor.descripcion}` : "❌");
  console.log("  PAR inalámbrico:  ", eqPARWL   ? `✅ ${eqPARWL.descripcion}`  : "❌");

  // ─── 5. Número de cotización ───────────────────────────────────────────────
  const [lastCot] = await sql`
    SELECT "numeroCotizacion" FROM cotizaciones ORDER BY "numeroCotizacion" DESC LIMIT 1
  `;
  const lastNum = lastCot ? parseInt(lastCot.numeroCotizacion.replace("COT-", "")) || 0 : 0;
  const numeroCotizacion = `COT-${String(lastNum + 1).padStart(4, "0")}`;
  console.log(`\n💰 Número de cotización: ${numeroCotizacion}`);

  // ─── 6. Crear Cotización ───────────────────────────────────────────────────
  const cotId = cuid();
  await sql`
    INSERT INTO cotizaciones (
      id, "numeroCotizacion", "tratoId", "clienteId", "creadaPorId",
      estado, "nombreEvento", "tipoEvento", "tipoServicio",
      "fechaEvento", "lugarEvento", "horasOperacion",
      "vigenciaDias", "aplicaIva",
      "subtotalEquiposBruto", "subtotalEquiposNeto",
      "subtotalOperacion", "subtotalTerceros",
      total, "granTotal",
      "planPagos", observaciones,
      "diasEquipo", "diasOperacion", "diasTransporte", "diasHospedaje", "diasComidas",
      "descuentoVolumenPct", "descuentoB2bPct", "descuentoMultidiaPct",
      "descuentoPatrocinioPct", "descuentoEspecialPct",
      "descuentoFijoMonto", "descuentoTotalPct", "montoDescuento",
      "subtotalPaquetes", "subtotalTransporte", "subtotalComidas", "subtotalHospedaje",
      "montoIva", "montoBeneficio", "costosTotalesEstimados",
      "utilidadEstimada", "porcentajeUtilidad",
      "pagoAnticipadoActivo", "incluirChofer",
      "zonaEvento", "numTecnicosZona",
      "createdAt", "updatedAt"
    ) VALUES (
      ${cotId}, ${numeroCotizacion}, ${tratoId}, ${clienteId}, ${admin?.id ?? null},
      'ENVIADA', 'Boda Juan Manuel Nava', 'SOCIAL', 'RENTA',
      '2027-02-20 18:00:00+00', 'Canto de Mar, Barra de Potosí, Guerrero', 5,
      15, false,
      65200, 65200,
      1500, 36000,
      71200, 71200,
      ${JSON.stringify([{concepto:"Anticipo 50%",porcentaje:50,monto:35600},{concepto:"Liquidación",porcentaje:50,monto:35600}])},
      'Precios sin IVA. Vigencia 15 días. Anticipo del 50% reserva fecha y equipo. Subrentas sujetas a confirmación de disponibilidad. Hora extra: $6,000. Traslados y viáticos no incluidos — se cotizan por separado.',
      1, 1, 1, 1, 1,
      0, 0, 0,
      0, 0,
      0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0,
      0, 0,
      false, false,
      'LOCAL', 0,
      now(), now()
    )
  `;
  console.log(`✅ Cotización cabecera creada: ${cotId}`);

  // ─── 7. Crear líneas ───────────────────────────────────────────────────────
  const lineas = [
    // Headers de sección
    { tipo:"OTRO", orden:0, desc:"─── CEREMONIA - AUDIO ───", qty:1, precio:0, sub:0, eqId:null, ext:false, notas:null },
    // Audio ceremonia
    { tipo: eqEKX12?"EQUIPO_PROPIO":"EQUIPO_EXTERNO", orden:1, desc:"Bocinas EV EKX 12P", marca:"EV", modelo:"EKX 12P", qty:2, precio:1000, sub:2000, eqId:eqEKX12?.id??null, ext:false, notas:null },
    { tipo:"EQUIPO_EXTERNO", orden:2, desc:"Mixer Yamaha MG10XUF", marca:"Yamaha", modelo:"MG10XUF", qty:1, precio:500, sub:500, eqId:null, ext:false, notas:null },
    { tipo: eqShure?"EQUIPO_PROPIO":"EQUIPO_EXTERNO", orden:3, desc:"Micrófonos inalámbricos Shure BLX24 SM58", marca:"Shure", modelo:"BLX24 SM58", qty:2, precio:300, sub:600, eqId:eqShure?.id??null, ext:false, notas:null },
    { tipo:"OPERACION_TECNICA", orden:4, desc:"Técnico de audio", qty:1, precio:1500, sub:1500, eqId:null, ext:false, notas:null },

    // Header
    { tipo:"OTRO", orden:5, desc:"─── RECEPCIÓN - AUDIO ───", qty:1, precio:0, sub:0, eqId:null, ext:false, notas:null },
    // Audio recepción
    { tipo: eqEKX18?"EQUIPO_PROPIO":"EQUIPO_EXTERNO", orden:6, desc:"Subwoofers EV EKX 18P", marca:"EV", modelo:"EKX 18P", qty:2, precio:1250, sub:2500, eqId:eqEKX18?.id??null, ext:false, notas:null },
    { tipo: eqEKX12?"EQUIPO_PROPIO":"EQUIPO_EXTERNO", orden:7, desc:"Bocinas EV EKX 12P", marca:"EV", modelo:"EKX 12P", qty:2, precio:1000, sub:2000, eqId:eqEKX12?.id??null, ext:false, notas:null },
    { tipo: eqMonitor?"EQUIPO_PROPIO":"EQUIPO_EXTERNO", orden:8, desc:"Monitor", qty:1, precio:500, sub:500, eqId:eqMonitor?.id??null, ext:false, notas:null },
    { tipo: eqShure?"EQUIPO_PROPIO":"EQUIPO_EXTERNO", orden:9, desc:"Micrófonos inalámbricos Shure BLX24 SM58", marca:"Shure", modelo:"BLX24 SM58", qty:2, precio:300, sub:600, eqId:eqShure?.id??null, ext:false, notas:null },

    // Header
    { tipo:"OTRO", orden:10, desc:"─── CABINA DJ PIONEER ───", qty:1, precio:0, sub:0, eqId:null, ext:false, notas:null },
    // DJ
    { tipo: eqCDJ?"EQUIPO_PROPIO":"EQUIPO_EXTERNO", orden:11, desc:"CDJ-3000 Pioneer", marca:"Pioneer", modelo:"CDJ-3000", qty:2, precio:1750, sub:3500, eqId:eqCDJ?.id??null, ext:false, notas:null },
    { tipo: eqDJM?"EQUIPO_PROPIO":"EQUIPO_EXTERNO", orden:12, desc:"Mezcladora DJM-A9 Pioneer", marca:"Pioneer", modelo:"DJM-A9", qty:1, precio:2000, sub:2000, eqId:eqDJM?.id??null, ext:false, notas:null },
    { tipo:"OTRO", orden:13, desc:"Booth DJ decorativo", qty:1, precio:1000, sub:1000, eqId:null, ext:false, notas:null },

    // Header
    { tipo:"OTRO", orden:14, desc:"─── ILUMINACIÓN RECEPCIÓN ───", qty:1, precio:0, sub:0, eqId:null, ext:false, notas:null },
    // Iluminación recepción
    { tipo: eqBeam?"EQUIPO_PROPIO":"EQUIPO_EXTERNO", orden:15, desc:"Cabezas móviles Lite Tek BEAM 280", marca:"Lite Tek", modelo:"BEAM 280", qty:6, precio:750, sub:4500, eqId:eqBeam?.id??null, ext:false, notas:null },
    { tipo: eqPAR?"EQUIPO_PROPIO":"EQUIPO_EXTERNO", orden:16, desc:"PAR LED arquitectónico", qty:8, precio:300, sub:2400, eqId:eqPAR?.id??null, ext:false, notas:null },
    { tipo:"EQUIPO_EXTERNO", orden:17, desc:"Lekos (subrenta externa)", qty:4, precio:1000, sub:4000, eqId:null, ext:true, notas:"EXTERNO / subrenta" },
    { tipo:"EQUIPO_EXTERNO", orden:18, desc:"Truss soporte (subrenta externa)", qty:4, precio:500, sub:2000, eqId:null, ext:true, notas:"EXTERNO / subrenta" },
    { tipo: eqMA?"EQUIPO_PROPIO":"EQUIPO_EXTERNO", orden:19, desc:"Consola MA Command Wing", marca:"MA Lighting", modelo:"Command Wing", qty:1, precio:1000, sub:1000, eqId:eqMA?.id??null, ext:false, notas:null },

    // Header
    { tipo:"OTRO", orden:20, desc:"─── ILUMINACIÓN AMBIENTAL ───", qty:1, precio:0, sub:0, eqId:null, ext:false, notas:null },
    { tipo: eqPARWL?"EQUIPO_PROPIO":"EQUIPO_EXTERNO", orden:21, desc:"PAR LED inalámbrico", qty:14, precio:400, sub:5600, eqId:eqPARWL?.id??null, ext:false, notas:null },

    // Header
    { tipo:"OTRO", orden:22, desc:"─── PISTA DE BAILE ───", qty:1, precio:0, sub:0, eqId:null, ext:false, notas:null },
    { tipo:"EQUIPO_EXTERNO", orden:23, desc:"Pista 6x6m madera (subrenta externa)", qty:1, precio:14000, sub:14000, eqId:null, ext:true, notas:"EXTERNO / subrenta" },

    // Header
    { tipo:"OTRO", orden:24, desc:"─── GENERADOR ───", qty:1, precio:0, sub:0, eqId:null, ext:false, notas:null },
    { tipo:"EQUIPO_EXTERNO", orden:25, desc:"Generador 45KW 10hrs (subrenta externa)", qty:1, precio:16000, sub:16000, eqId:null, ext:true, notas:"EXTERNO / subrenta" },
  ];

  for (const l of lineas) {
    const lineaId = cuid();
    await sql`
      INSERT INTO cotizacion_lineas (
        id, "cotizacionId", tipo, orden,
        "equipoId", descripcion,
        marca, modelo,
        "esExterno", cantidad, dias,
        "precioUnitario", "costoUnitario", subtotal,
        "esIncluido", notas
      ) VALUES (
        ${lineaId}, ${cotId}, ${l.tipo}, ${l.orden},
        ${l.eqId ?? null}, ${l.desc},
        ${l.marca ?? null}, ${l.modelo ?? null},
        ${l.ext ?? false}, ${l.qty}, 1,
        ${l.precio}, 0, ${l.sub},
        false, ${l.notas ?? null}
      )
    `;
  }
  console.log(`✅ ${lineas.length} líneas creadas`);

  console.log(`\n🎉 LISTO:`);
  console.log(`   Cliente:     ${clienteId}`);
  console.log(`   Trato CRM:   /crm/tratos/${tratoId}`);
  console.log(`   Cotización:  /cotizaciones/${cotId}`);
  console.log(`   PDF:         /api/cotizaciones/${cotId}/pdf`);
  console.log(`   Total:       $71,200 MXN`);
  console.log(`   Anticipo:    $35,600 | Liquidación: $35,600`);
}

main().catch(e => {
  console.error("❌", e.message);
  process.exit(1);
});
