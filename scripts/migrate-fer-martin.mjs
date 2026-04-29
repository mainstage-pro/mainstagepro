/**
 * Migración: PROYECTO FER MARTIN 10 OCTUBRE 2026.xlsx
 * Crea cliente → trato → cotización desde el documento de Sheets.
 *
 * Ejecutar: node scripts/migrate-fer-martin.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Datos extraídos del Excel ───────────────────────────────────────────────

const CLIENTE = {
  nombre: "Fer Martín",
  empresa: null,           // particular
  tipoCliente: "B2C",
  clasificacion: "REGULAR",
  telefono: "4423228540",
};

const TRATO = {
  tipoEvento: "SOCIAL",
  tipoServicio: "PRODUCCION_TECNICA",
  nombreEvento: "Proyecto Fer Martín",
  lugarEstimado: "Por definir",
  fechaEventoEstimada: new Date("2026-10-10"),
  presupuestoEstimado: 18490,
  etapa: "OPORTUNIDAD",
  tipoLead: "INBOUND",
  origenLead: "RECOMPRA",
  clasificacion: "REGULAR",
  rutaEntrada: "DESCUBRIR",
};

const COTIZACION = {
  nombreEvento: "Proyecto Fer Martín",
  tipoEvento: "SOCIAL",
  tipoServicio: "PRODUCCION_TECNICA",
  fechaEvento: new Date("2026-10-10"),
  lugarEvento: "Por definir",
  diasEquipo: 1,
  diasOperacion: 1,
  diasTransporte: 1,
  diasComidas: 1,
  diasHospedaje: 1,
  aplicaIva: false,
  vigenciaDias: 30,
  tipoBeneficio: "DESCUENTO",
  // Financial summary (calculado manualmente — coincide con cotizador)
  subtotalEquiposBruto: 15400,
  descuentoVolumenPct: 0,
  descuentoB2bPct: 0,
  descuentoMultidiaPct: 0,
  descuentoPatrocinioPct: 0,
  descuentoEspecialPct: 0.15,        // 2310 / 15400 = 15%
  descuentoTotalPct: 0.15,
  montoDescuento: 2310,
  montoBeneficio: 2310,
  subtotalEquiposNeto: 13090,
  subtotalPaquetes: 0,
  subtotalTerceros: 0,
  subtotalOperacion: 3500,
  subtotalTransporte: 1000,
  subtotalComidas: 900,
  subtotalHospedaje: 0,
  total: 18490,
  montoIva: 0,
  granTotal: 18490,
  costosTotalesEstimados: 5400,      // operación + transporte + comidas (pass-through)
  utilidadEstimada: 13090,
  porcentajeUtilidad: 0.708,
};

// ── Líneas del documento ────────────────────────────────────────────────────

const LINEAS = [
  // ─── EQUIPO PROPIO ─────────────────────────────────────────────────────
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Bocina activa Electro Voice EKX 12P",
    marca: "Electro Voice",
    cantidad: 1, dias: 1,
    precioUnitario: 1000, subtotal: 1000,
    esIncluido: false,
  },
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Cabeza móvil tipo spot Chauvet Intimidator Spot 260",
    marca: "Chauvet",
    cantidad: 4, dias: 1,
    precioUnitario: 500, subtotal: 2000,
    esIncluido: false,
  },
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Par led con control BT Chauvet Slimpar",
    marca: "Chauvet",
    cantidad: 4, dias: 1,
    precioUnitario: 250, subtotal: 1000,
    esIncluido: false,
  },
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Laser 6 watts",
    marca: "Laser",
    cantidad: 2, dias: 1,
    precioUnitario: 1000, subtotal: 2000,
    esIncluido: false,
  },
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Barras Chauvet Pinspot Bar (6 piezas)",
    marca: "Chauvet",
    cantidad: 2, dias: 1,
    precioUnitario: 1000, subtotal: 2000,
    esIncluido: false,
  },
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Par led inalámbrica batería 7-8 horas",
    cantidad: 12, dias: 1,
    precioUnitario: 400, subtotal: 4800,
    esIncluido: false,
  },
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Máquina de haze Lite Tek Fazer 1500",
    marca: "Lite Tek",
    cantidad: 1, dias: 1,
    precioUnitario: 1000, subtotal: 1000,
    esIncluido: false,
  },
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Booth decorativo premium color blanco",
    cantidad: 1, dias: 1,
    precioUnitario: 1000, subtotal: 1000,
    esIncluido: false,
  },
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Templete 3.75 x 1.25 m",
    cantidad: 3, dias: 1,
    precioUnitario: 200, subtotal: 600,
    esIncluido: false,
  },
  // Equipos incluidos (precio 0, forman parte del servicio)
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Micrófono inalámbrico Shure BLX24",
    marca: "Shure",
    cantidad: 2, dias: 1,
    precioUnitario: 0, subtotal: 0,
    esIncluido: true,
    notas: "Incluye",
  },
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Torres de truss 3M con base y tubo",
    cantidad: 4, dias: 1,
    precioUnitario: 0, subtotal: 0,
    esIncluido: true,
    notas: "Incluye",
  },
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Controlador de iluminación ADJ Wolfmix",
    marca: "ADJ",
    cantidad: 1, dias: 1,
    precioUnitario: 0, subtotal: 0,
    esIncluido: true,
    notas: "Incluye",
  },
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Set de cableado de señal y corriente",
    cantidad: 1, dias: 1,
    precioUnitario: 0, subtotal: 0,
    esIncluido: true,
    notas: "Incluye",
  },
  {
    tipo: "EQUIPO_PROPIO",
    descripcion: "Booth negro de triplay",
    cantidad: 1, dias: 1,
    precioUnitario: 0, subtotal: 0,
    esIncluido: true,
    notas: "Incluye",
  },

  // ─── OPERACIÓN TÉCNICA ─────────────────────────────────────────────────
  {
    tipo: "OPERACION_TECNICA",
    descripcion: "Operador de iluminación",
    nivel: "OPERADOR DE ILUMINACIÓN",
    cantidad: 1, dias: 1,
    precioUnitario: 1500, costoUnitario: 1500, subtotal: 1500,
    esIncluido: false,
  },
  {
    tipo: "OPERACION_TECNICA",
    descripcion: "Stagehand / Staff iluminación",
    nivel: "STAGEHAND",
    cantidad: 2, dias: 1,
    precioUnitario: 1000, costoUnitario: 1000, subtotal: 2000,
    esIncluido: false,
  },

  // ─── TRANSPORTE ────────────────────────────────────────────────────────
  {
    tipo: "TRANSPORTE",
    descripcion: "Gasolina / traslados",
    cantidad: 1, dias: 1,
    precioUnitario: 1000, costoUnitario: 1000, subtotal: 1000,
    esIncluido: false,
  },

  // ─── COMIDAS ───────────────────────────────────────────────────────────
  {
    tipo: "COMIDA",
    descripcion: "2 comidas por elemento (3 personas)",
    cantidad: 3, dias: 1,
    precioUnitario: 300, costoUnitario: 300, subtotal: 900,
    esIncluido: false,
  },
];

// ── Script principal ────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Iniciando migración PROYECTO FER MARTIN...\n");

  // 1. Buscar vendedor Mauricio Hernández
  const vendedor = await prisma.user.findFirst({
    where: { name: { contains: "Mauricio", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!vendedor) throw new Error("No se encontró usuario Mauricio. Verifica el nombre exacto en la BD.");
  console.log(`✅ Vendedor encontrado: ${vendedor.name} (${vendedor.id})`);

  // 2. Crear o reutilizar cliente
  let cliente = await prisma.cliente.findFirst({
    where: { nombre: { equals: "Fer Martín", mode: "insensitive" } },
  });
  if (cliente) {
    console.log(`ℹ️  Cliente ya existe: ${cliente.nombre} (${cliente.id})`);
  } else {
    cliente = await prisma.cliente.create({ data: CLIENTE });
    console.log(`✅ Cliente creado: ${cliente.nombre} (${cliente.id})`);
  }

  // 3. Crear trato
  const trato = await prisma.trato.create({
    data: {
      ...TRATO,
      clienteId: cliente.id,
      responsableId: vendedor.id,
      vendedorId: vendedor.id,
      tipoLead: "INBOUND",
      origenLead: "RECOMPRA",
      origenVenta: "CLIENTE_PROPIO",
      estatusContacto: "CONTACTADO",
      descubrimientoCompleto: true,
    },
  });
  console.log(`✅ Trato creado: ${trato.id}`);

  // 4. Generar número de cotización
  const lastCot = await prisma.cotizacion.findFirst({
    orderBy: { numeroCotizacion: "desc" },
    select: { numeroCotizacion: true },
  });
  const lastNum = lastCot ? parseInt(lastCot.numeroCotizacion.replace("COT-", "")) || 0 : 0;
  const numeroCotizacion = `COT-${String(lastNum + 1).padStart(4, "0")}`;

  // 5. Crear cotización con todas las líneas
  const cotizacion = await prisma.cotizacion.create({
    data: {
      numeroCotizacion,
      tratoId: trato.id,
      clienteId: cliente.id,
      creadaPorId: vendedor.id,
      estado: "BORRADOR",
      opcionLetra: "A",
      ...COTIZACION,
      lineas: {
        create: LINEAS.map((l, i) => ({
          tipo: l.tipo,
          orden: i,
          descripcion: l.descripcion,
          marca: l.marca ?? null,
          nivel: l.nivel ?? null,
          cantidad: l.cantidad,
          dias: l.dias,
          precioUnitario: l.precioUnitario,
          costoUnitario: l.costoUnitario ?? 0,
          subtotal: l.subtotal,
          esIncluido: l.esIncluido ?? false,
          notas: l.notas ?? null,
          esExterno: false,
          jornada: null,
          equipoId: null,
          rolTecnicoId: null,
          proveedorId: null,
          costoExterno: null,
        })),
      },
    },
    include: { lineas: true },
  });

  console.log(`\n✅ Cotización creada: ${numeroCotizacion} (${cotizacion.id})`);
  console.log(`   Líneas: ${cotizacion.lineas.length}`);
  console.log(`   Gran total: $${COTIZACION.granTotal.toLocaleString("es-MX")}`);
  console.log(`\n🔗 Trato:      /crm/tratos/${trato.id}`);
  console.log(`🔗 Cotización: /cotizaciones/${cotizacion.id}`);
  console.log("\n✔  Migración completada.");
}

main()
  .catch(e => { console.error("❌ Error:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
