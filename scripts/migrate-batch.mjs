/**
 * Migración en lote: 5 cotizaciones desde COTIZACIONES PENDIENTES/
 * Ejecutar: node scripts/migrate-batch.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Datos de los 5 proyectos ────────────────────────────────────────────────

const PROYECTOS = [

  // ══════════════════════════════════════════════════════════════════════════
  // 1. ANA PAULA DE LOS COBOS — Boda 29 agosto 2026, Hacienda El Molino
  // ══════════════════════════════════════════════════════════════════════════
  {
    cliente: {
      nombre: "Ana Paula de los Cobos",
      tipoCliente: "B2C",
      clasificacion: "REGULAR",
      telefono: "4427905546",
    },
    trato: {
      tipoEvento: "SOCIAL",
      tipoServicio: "PRODUCCION_TECNICA",
      nombreEvento: "Proyecto Ana Paula de los Cobos",
      lugarEstimado: "Hacienda El Molino",
      fechaEventoEstimada: new Date("2026-08-29"),
      presupuestoEstimado: 40190,
      etapa: "OPORTUNIDAD",
    },
    cotizacion: {
      nombreEvento: "Proyecto Ana Paula de los Cobos",
      tipoEvento: "SOCIAL",
      tipoServicio: "PRODUCCION_TECNICA",
      fechaEvento: new Date("2026-08-29"),
      lugarEvento: "Hacienda El Molino",
      diasEquipo: 1, diasOperacion: 1, diasTransporte: 1, diasComidas: 1, diasHospedaje: 1,
      aplicaIva: false,
      vigenciaDias: 30,
      tipoBeneficio: "DESCUENTO",
      subtotalEquiposBruto: 31800,
      descuentoVolumenPct: 0, descuentoB2bPct: 0, descuentoMultidiaPct: 0,
      descuentoPatrocinioPct: 0, descuentoEspecialPct: 0.20,
      descuentoTotalPct: 0.20,
      montoDescuento: 6360,
      montoBeneficio: 6360,
      subtotalEquiposNeto: 25440,
      subtotalPaquetes: 0,
      subtotalTerceros: 6000,
      subtotalOperacion: 8750,   // 5250 técnicos + 3500 DJ
      subtotalTransporte: 0,
      subtotalComidas: 0,
      subtotalHospedaje: 0,
      total: 40190,
      montoIva: 0,
      granTotal: 40190,
      costosTotalesEstimados: 14750,   // 6000 corriente + 8750 operación
      utilidadEstimada: 25440,
      porcentajeUtilidad: 0.633,
    },
    lineas: [
      // EQUIPO PROPIO
      { tipo: "EQUIPO_PROPIO", descripcion: "Altavoz activo Electro Voice EKX 12P", marca: "Electro Voice", cantidad: 4, dias: 1, precioUnitario: 1000, subtotal: 4000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Subwoofer activo Electro Voice EKX 18P", marca: "Electro Voice", cantidad: 4, dias: 1, precioUnitario: 1250, subtotal: 5000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Par LED inalámbrico (7-8 hrs batería)", cantidad: 12, dias: 1, precioUnitario: 300, subtotal: 3600 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Efecto de iluminación Sun Star Kaleidos (wash)", marca: "Sun Star", cantidad: 4, dias: 1, precioUnitario: 500, subtotal: 2000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Luminaria ambiental Chauvet Slimpar Q12 BT", marca: "Chauvet", cantidad: 8, dias: 1, precioUnitario: 250, subtotal: 2000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Luminaria baño de color Chauvet Slimpar Q12 BT", marca: "Chauvet", cantidad: 8, dias: 1, precioUnitario: 250, subtotal: 2000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Cabeza móvil tipo beam Lite Tek Beam 280", marca: "Lite Tek", cantidad: 8, dias: 1, precioUnitario: 1000, subtotal: 8000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Barra de pinspots Chauvet Pinspot Bar 6 pzs (mesa novios)", marca: "Chauvet", cantidad: 1, dias: 1, precioUnitario: 1500, subtotal: 1500 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Barra de pinspots Chauvet Pinspot Bar 6 pzs (mesa dulces)", marca: "Chauvet", cantidad: 1, dias: 1, precioUnitario: 1500, subtotal: 1500 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Máquina de haze Lite Tek Fazer 1500", marca: "Lite Tek", cantidad: 1, dias: 1, precioUnitario: 1000, subtotal: 1000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Templete 3.75 x 2.5 m (tarimas 1.25x1.25)", cantidad: 6, dias: 1, precioUnitario: 200, subtotal: 1200 },
      // EQUIPO EXTERNO (corriente eléctrica)
      { tipo: "EQUIPO_EXTERNO", descripcion: "Planta de luz 20KW por 8 horas", cantidad: 1, dias: 1, precioUnitario: 6000, costoUnitario: 6000, subtotal: 6000, esExterno: true },
      // OPERACIÓN TÉCNICA
      { tipo: "OPERACION_TECNICA", descripcion: "Operador de iluminación", nivel: "OPERADOR DE ILUMINACIÓN", cantidad: 1, dias: 1, precioUnitario: 1500, costoUnitario: 1500, subtotal: 1500 },
      { tipo: "OPERACION_TECNICA", descripcion: "Stagehand / Staff iluminación", nivel: "STAGEHAND", cantidad: 3, dias: 1, precioUnitario: 1250, costoUnitario: 1250, subtotal: 3750 },
      // DJ
      { tipo: "DJ", descripcion: "Servicio de DJ por 9 horas", cantidad: 1, dias: 1, precioUnitario: 3500, costoUnitario: 3500, subtotal: 3500 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 2. ESTEBAN ROSAS — Boda 2 mayo 2026, Ex Convento de Santo Domingo
  // ══════════════════════════════════════════════════════════════════════════
  {
    cliente: {
      nombre: "Esteban Rosas",
      tipoCliente: "B2C",
      clasificacion: "REGULAR",
    },
    trato: {
      tipoEvento: "SOCIAL",
      tipoServicio: "PRODUCCION_TECNICA",
      nombreEvento: "Proyecto Esteban Rosas",
      lugarEstimado: "Ex Convento de Santo Domingo",
      fechaEventoEstimada: new Date("2026-05-02"),
      presupuestoEstimado: 14885.7,
      etapa: "OPORTUNIDAD",
    },
    cotizacion: {
      nombreEvento: "Proyecto Esteban Rosas",
      tipoEvento: "SOCIAL",
      tipoServicio: "PRODUCCION_TECNICA",
      fechaEvento: new Date("2026-05-02"),
      lugarEvento: "Ex Convento de Santo Domingo",
      diasEquipo: 1, diasOperacion: 1, diasTransporte: 1, diasComidas: 1, diasHospedaje: 1,
      aplicaIva: true,
      vigenciaDias: 30,
      tipoBeneficio: "DESCUENTO",
      subtotalEquiposBruto: 7450,
      descuentoVolumenPct: 0, descuentoB2bPct: 0, descuentoMultidiaPct: 0,
      descuentoPatrocinioPct: 0, descuentoEspecialPct: 0.15,
      descuentoTotalPct: 0.15,
      montoDescuento: 1117.5,
      montoBeneficio: 1117.5,
      subtotalEquiposNeto: 6332.5,
      subtotalPaquetes: 0,
      subtotalTerceros: 2500,
      subtotalOperacion: 4000,   // iluminados $1000 + hand staff $1000 + DJ $2000
      subtotalTransporte: 0,
      subtotalComidas: 0,
      subtotalHospedaje: 0,
      total: 12832.5,
      montoIva: 2053.2,
      granTotal: 14885.7,
      costosTotalesEstimados: 6500,
      utilidadEstimada: 6332.5,
      porcentajeUtilidad: 0.494,
    },
    lineas: [
      // EQUIPO PROPIO
      { tipo: "EQUIPO_PROPIO", descripcion: "Bocina activa Electro Voice EKX 12P", marca: "Electro Voice", cantidad: 2, dias: 1, precioUnitario: 1000, subtotal: 2000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Subwoofer activo Electro Voice EKX 18P", marca: "Electro Voice", cantidad: 1, dias: 1, precioUnitario: 1250, subtotal: 1250 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Cabeza móvil tipo spot Chauvet Intimidator Spot 260", marca: "Chauvet", cantidad: 4, dias: 1, precioUnitario: 500, subtotal: 2000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Par led con control BT Chauvet Slimpar Q12 BT", marca: "Chauvet", cantidad: 4, dias: 1, precioUnitario: 300, subtotal: 1200 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Booth decorativo en acabado tipo mármol", cantidad: 1, dias: 1, precioUnitario: 1000, subtotal: 1000 },
      // EQUIPO EXTERNO
      { tipo: "EQUIPO_EXTERNO", descripcion: "Planta eléctrica portátil Predator 9,500W", cantidad: 1, dias: 1, precioUnitario: 2500, costoUnitario: 2500, subtotal: 2500, esExterno: true },
      // OPERACIÓN TÉCNICA
      { tipo: "OPERACION_TECNICA", descripcion: "Iluminados — montaje/desmontaje", nivel: "STAGEHAND", cantidad: 1, dias: 1, precioUnitario: 1000, costoUnitario: 1000, subtotal: 1000 },
      { tipo: "OPERACION_TECNICA", descripcion: "Hand Staff — montaje/desmontaje", nivel: "STAGEHAND", cantidad: 1, dias: 1, precioUnitario: 1000, costoUnitario: 1000, subtotal: 1000 },
      // DJ
      { tipo: "DJ", descripcion: "DJ por hora (5 horas)", cantidad: 5, dias: 1, precioUnitario: 400, costoUnitario: 400, subtotal: 2000 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 3. LUCA MERSINI — XV Cumpleaños 23 mayo 2026, Colegio Álamos
  // ══════════════════════════════════════════════════════════════════════════
  {
    cliente: {
      nombre: "Luca Mersini",
      tipoCliente: "B2C",
      clasificacion: "REGULAR",
      telefono: "4428642809",
    },
    trato: {
      tipoEvento: "SOCIAL",
      tipoServicio: "PRODUCCION_TECNICA",
      nombreEvento: "Proyecto Luca Mersini — XV Cumpleaños",
      lugarEstimado: "Colegio Álamos",
      fechaEventoEstimada: new Date("2026-05-23"),
      presupuestoEstimado: 131236.6,
      etapa: "OPORTUNIDAD",
    },
    cotizacion: {
      nombreEvento: "Proyecto Luca Mersini — XV Cumpleaños",
      tipoEvento: "SOCIAL",
      tipoServicio: "PRODUCCION_TECNICA",
      fechaEvento: new Date("2026-05-23"),
      lugarEvento: "Colegio Álamos",
      diasEquipo: 1, diasOperacion: 1, diasTransporte: 1, diasComidas: 1, diasHospedaje: 1,
      aplicaIva: true,
      vigenciaDias: 30,
      tipoBeneficio: "DESCUENTO",
      subtotalEquiposBruto: 79900,
      descuentoVolumenPct: 0, descuentoB2bPct: 0, descuentoMultidiaPct: 0,
      descuentoPatrocinioPct: 0, descuentoEspecialPct: 0.35,
      descuentoTotalPct: 0.35,
      montoDescuento: 27965,
      montoBeneficio: 27965,
      subtotalEquiposNeto: 51935,
      subtotalPaquetes: 0,
      subtotalTerceros: 39800,   // corriente $10,000 + terceros $29,800
      subtotalOperacion: 17500,
      subtotalTransporte: 0,
      subtotalComidas: 3900,
      subtotalHospedaje: 0,
      total: 113135,
      montoIva: 18101.6,
      granTotal: 131236.6,
      costosTotalesEstimados: 61200,
      utilidadEstimada: 51935,
      porcentajeUtilidad: 0.459,
    },
    lineas: [
      // EQUIPO PROPIO — Audio
      { tipo: "EQUIPO_PROPIO", descripcion: "Line array activa RCF HDL 6A", marca: "RCF", cantidad: 12, dias: 1, precioUnitario: 1000, subtotal: 12000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Subwoofer activo RCF SUB 8006 AS", marca: "RCF", cantidad: 3, dias: 1, precioUnitario: 3000, subtotal: 9000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Bocina activa Electro Voice EKX 12P", marca: "Electro Voice", cantidad: 3, dias: 1, precioUnitario: 1000, subtotal: 3000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Micrófono inalámbrico Shure SLXD B58", marca: "Shure", cantidad: 2, dias: 1, precioUnitario: 500, subtotal: 1000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Sistema in-ear Sennheiser IEM G4", marca: "Sennheiser", cantidad: 2, dias: 1, precioUnitario: 500, subtotal: 1000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Consola Allen & Heath SQ5", marca: "Allen & Heath", cantidad: 1, dias: 1, precioUnitario: 2000, subtotal: 2000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Stagebox Allen & Heath AR24/12", marca: "Allen & Heath", cantidad: 1, dias: 1, precioUnitario: 1500, subtotal: 1500 },
      // EQUIPO PROPIO — Iluminación
      { tipo: "EQUIPO_PROPIO", descripcion: "Cabeza móvil tipo beam Lite Tek Beam 280", marca: "Lite Tek", cantidad: 12, dias: 1, precioUnitario: 500, subtotal: 6000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Efecto de iluminación Sun Star Kaleidos", marca: "Sun Star", cantidad: 8, dias: 1, precioUnitario: 500, subtotal: 4000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Luminaria RGBW Sun Star Soul", marca: "Sun Star", cantidad: 8, dias: 1, precioUnitario: 500, subtotal: 4000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Estrobo Lite Tek Flasher 200", marca: "Lite Tek", cantidad: 12, dias: 1, precioUnitario: 250, subtotal: 3000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Blinder Lite Tek Blinder 200", marca: "Lite Tek", cantidad: 8, dias: 1, precioUnitario: 250, subtotal: 2000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Seguidores / Followspot", cantidad: 2, dias: 1, precioUnitario: 1000, subtotal: 2000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "MA Command Wing (controlador iluminación)", marca: "MA Lighting", cantidad: 1, dias: 1, precioUnitario: 1500, subtotal: 1500 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Máquina de haze Lite Tek Fazer 1500", marca: "Lite Tek", cantidad: 2, dias: 1, precioUnitario: 1000, subtotal: 2000 },
      // EQUIPO PROPIO — Rigging y estructuras
      { tipo: "EQUIPO_PROPIO", descripcion: "Elevadores de audio 6 metros", cantidad: 2, dias: 1, precioUnitario: 1000, subtotal: 2000 },
      // EQUIPO PROPIO — Video
      { tipo: "EQUIPO_PROPIO", descripcion: "Pantalla LED pitch 3.9mm en medida 6×2 metros", cantidad: 1, dias: 1, precioUnitario: 12000, subtotal: 12000 },
      // EQUIPO PROPIO — Entarimado
      { tipo: "EQUIPO_PROPIO", descripcion: "Tarima 10×7.5 metros a 80 cm de altura", cantidad: 1, dias: 1, precioUnitario: 9500, subtotal: 9500 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Tarima 2.5×2.5 metros a 30 cm de altura", cantidad: 3, dias: 1, precioUnitario: 800, subtotal: 2400 },
      // EQUIPO EXTERNO — Corriente eléctrica
      { tipo: "EQUIPO_EXTERNO", descripcion: "Centro de carga Lite Tek 3 fases", cantidad: 1, dias: 1, precioUnitario: 3000, costoUnitario: 3000, subtotal: 3000, esExterno: true },
      { tipo: "EQUIPO_EXTERNO", descripcion: "Generador de luz 60KW por 8 horas", cantidad: 1, dias: 1, precioUnitario: 7000, costoUnitario: 7000, subtotal: 7000, esExterno: true },
      // EQUIPO EXTERNO — Terceros
      { tipo: "EQUIPO_EXTERNO", descripcion: "Ground Support 12×7×6 metros", cantidad: 1, dias: 1, precioUnitario: 25000, costoUnitario: 25000, subtotal: 25000, esExterno: true },
      { tipo: "EQUIPO_EXTERNO", descripcion: "Bidones de agua", cantidad: 2, dias: 1, precioUnitario: 1500, costoUnitario: 1500, subtotal: 3000, esExterno: true },
      { tipo: "EQUIPO_EXTERNO", descripcion: "Pipa de agua", cantidad: 1, dias: 1, precioUnitario: 1800, costoUnitario: 1800, subtotal: 1800, esExterno: true },
      // OPERACIÓN TÉCNICA
      { tipo: "OPERACION_TECNICA", descripcion: "Ingeniero de sala (audio)", nivel: "INGENIERO DE SALA", cantidad: 1, dias: 1, precioUnitario: 2500, costoUnitario: 2500, subtotal: 2500 },
      { tipo: "OPERACION_TECNICA", descripcion: "Técnico de audio", nivel: "TÉCNICO DE AUDIO", cantidad: 1, dias: 1, precioUnitario: 1000, costoUnitario: 1000, subtotal: 1000 },
      { tipo: "OPERACION_TECNICA", descripcion: "Stagehand / Staff audio", nivel: "STAGEHAND", cantidad: 4, dias: 1, precioUnitario: 1000, costoUnitario: 1000, subtotal: 4000 },
      { tipo: "OPERACION_TECNICA", descripcion: "Ingeniero de iluminación", nivel: "INGENIERO DE ILUMINACIÓN", cantidad: 1, dias: 1, precioUnitario: 2500, costoUnitario: 2500, subtotal: 2500 },
      { tipo: "OPERACION_TECNICA", descripcion: "Stagehand / Staff iluminación", nivel: "STAGEHAND", cantidad: 4, dias: 1, precioUnitario: 1000, costoUnitario: 1000, subtotal: 4000 },
      { tipo: "OPERACION_TECNICA", descripcion: "Operador de video", nivel: "OPERADOR DE VIDEO", cantidad: 1, dias: 1, precioUnitario: 1500, costoUnitario: 1500, subtotal: 1500 },
      { tipo: "OPERACION_TECNICA", descripcion: "Stagehand / Staff video", nivel: "STAGEHAND", cantidad: 2, dias: 1, precioUnitario: 1000, costoUnitario: 1000, subtotal: 2000 },
      // COMIDAS
      { tipo: "COMIDA", descripcion: "Comidas del personal (30 comidas × $130)", cantidad: 30, dias: 1, precioUnitario: 130, costoUnitario: 130, subtotal: 3900 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 4. LUIS VEGA — XV Años de Luciana, 12 septiembre 2026
  // ══════════════════════════════════════════════════════════════════════════
  {
    cliente: {
      nombre: "Luis Vega",
      tipoCliente: "B2C",
      clasificacion: "REGULAR",
      telefono: "4422499310",
    },
    trato: {
      tipoEvento: "SOCIAL",
      tipoServicio: "PRODUCCION_TECNICA",
      nombreEvento: "XV Años de Luciana",
      lugarEstimado: "Por definir",
      fechaEventoEstimada: new Date("2026-09-12"),
      presupuestoEstimado: 11774,
      etapa: "OPORTUNIDAD",
    },
    cotizacion: {
      nombreEvento: "XV Años de Luciana",
      tipoEvento: "SOCIAL",
      tipoServicio: "PRODUCCION_TECNICA",
      fechaEvento: new Date("2026-09-12"),
      lugarEvento: "Por definir",
      diasEquipo: 1, diasOperacion: 1, diasTransporte: 1, diasComidas: 1, diasHospedaje: 1,
      aplicaIva: true,
      vigenciaDias: 30,
      tipoBeneficio: "DESCUENTO",
      subtotalEquiposBruto: 10200,
      descuentoVolumenPct: 0, descuentoB2bPct: 0, descuentoMultidiaPct: 0,
      descuentoPatrocinioPct: 0, descuentoEspecialPct: 0.24,
      descuentoTotalPct: 0.24,
      montoDescuento: 2450,
      montoBeneficio: 2450,
      subtotalEquiposNeto: 7750,
      subtotalPaquetes: 0,
      subtotalTerceros: 0,
      subtotalOperacion: 2400,   // servicio DJ 6 horas
      subtotalTransporte: 0,
      subtotalComidas: 0,
      subtotalHospedaje: 0,
      total: 10150,
      montoIva: 1624,
      granTotal: 11774,
      costosTotalesEstimados: 2400,
      utilidadEstimada: 7750,
      porcentajeUtilidad: 0.763,
    },
    lineas: [
      // EQUIPO PROPIO
      { tipo: "EQUIPO_PROPIO", descripcion: "Bocina activa Electro Voice EKX 12P", marca: "Electro Voice", cantidad: 2, dias: 1, precioUnitario: 1000, subtotal: 2000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Subwoofer activo Electro Voice EKX 18P", marca: "Electro Voice", cantidad: 2, dias: 1, precioUnitario: 1250, subtotal: 2500 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Cabeza móvil tipo beam Lite Tek Beam 280", marca: "Lite Tek", cantidad: 4, dias: 1, precioUnitario: 750, subtotal: 3000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Par led con control BT Chauvet Slimpar Q12 BT", marca: "Chauvet", cantidad: 4, dias: 1, precioUnitario: 250, subtotal: 1000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Máquina de haze Lite Tek Fazer 1500", marca: "Lite Tek", cantidad: 1, dias: 1, precioUnitario: 500, subtotal: 500 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Templete / Tarima 1.25×1.25 m", cantidad: 6, dias: 1, precioUnitario: 200, subtotal: 1200 },
      // DJ
      { tipo: "DJ", descripcion: "Servicio de DJ por 6 horas continuas", cantidad: 1, dias: 1, precioUnitario: 2400, costoUnitario: 2400, subtotal: 2400 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 5. RICARDO PADILLA — Boda 2 mayo 2026, Hacienda El Aguacate Tequisquiapan
  // ══════════════════════════════════════════════════════════════════════════
  {
    cliente: {
      nombre: "Ricardo Padilla",
      tipoCliente: "B2C",
      clasificacion: "REGULAR",
    },
    trato: {
      tipoEvento: "SOCIAL",
      tipoServicio: "PRODUCCION_TECNICA",
      nombreEvento: "Proyecto Ricardo Padilla",
      lugarEstimado: "Hacienda El Aguacate, Tequisquiapan",
      fechaEventoEstimada: new Date("2026-05-02"),
      presupuestoEstimado: 34017,
      etapa: "OPORTUNIDAD",
    },
    cotizacion: {
      nombreEvento: "Proyecto Ricardo Padilla",
      tipoEvento: "SOCIAL",
      tipoServicio: "PRODUCCION_TECNICA",
      fechaEvento: new Date("2026-05-02"),
      lugarEvento: "Hacienda El Aguacate, Tequisquiapan",
      diasEquipo: 1, diasOperacion: 1, diasTransporte: 1, diasComidas: 1, diasHospedaje: 1,
      aplicaIva: true,
      vigenciaDias: 30,
      tipoBeneficio: "DESCUENTO",
      subtotalEquiposBruto: 21100,
      descuentoVolumenPct: 0, descuentoB2bPct: 0, descuentoMultidiaPct: 0,
      descuentoPatrocinioPct: 0, descuentoEspecialPct: 0.05,
      descuentoTotalPct: 0.05,
      montoDescuento: 1055,
      montoBeneficio: 1055,
      subtotalEquiposNeto: 20045,
      subtotalPaquetes: 0,
      subtotalTerceros: 4500,   // planta 15KW + centro de carga
      subtotalOperacion: 4000,
      subtotalTransporte: 0,
      subtotalComidas: 780,
      subtotalHospedaje: 0,
      total: 29325,
      montoIva: 4692,
      granTotal: 34017,
      costosTotalesEstimados: 9280,
      utilidadEstimada: 20045,
      porcentajeUtilidad: 0.683,
    },
    lineas: [
      // EQUIPO PROPIO — Audio
      { tipo: "EQUIPO_PROPIO", descripcion: "Bocina activa Electro Voice EKX 12P (principales)", marca: "Electro Voice", cantidad: 2, dias: 1, precioUnitario: 1000, subtotal: 2000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Bocina activa Electro Voice EKX 12P (recepción)", marca: "Electro Voice", cantidad: 2, dias: 1, precioUnitario: 1000, subtotal: 2000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Subwoofer activo Electro Voice EKX 18P", marca: "Electro Voice", cantidad: 4, dias: 1, precioUnitario: 1250, subtotal: 5000 },
      // EQUIPO PROPIO — Iluminación
      { tipo: "EQUIPO_PROPIO", descripcion: "Cabeza móvil tipo spot Chauvet Intimidator Spot 260", marca: "Chauvet", cantidad: 4, dias: 1, precioUnitario: 500, subtotal: 2000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Láser LED 6 watts CYMPROLED", cantidad: 4, dias: 1, precioUnitario: 1500, subtotal: 6000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Barra led Lite Tek BAR 824i", marca: "Lite Tek", cantidad: 2, dias: 1, precioUnitario: 250, subtotal: 500 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Par led con control BT Chauvet Slimpar Q12 BT", marca: "Chauvet", cantidad: 4, dias: 1, precioUnitario: 250, subtotal: 1000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Máquina de haze Lite Tek Fazer 1500", marca: "Lite Tek", cantidad: 1, dias: 1, precioUnitario: 1000, subtotal: 1000 },
      // EQUIPO PROPIO — DJ Booth y entarimado
      { tipo: "EQUIPO_PROPIO", descripcion: "Booth decorativo tipo mármol color blanco", cantidad: 1, dias: 1, precioUnitario: 1000, subtotal: 1000 },
      { tipo: "EQUIPO_PROPIO", descripcion: "Templete 3.75×1.25 m (tarimas 1.25×1.25)", cantidad: 3, dias: 1, precioUnitario: 200, subtotal: 600 },
      // EQUIPO EXTERNO — Corriente eléctrica
      { tipo: "EQUIPO_EXTERNO", descripcion: "Planta eléctrica 15KW Predator 15,000", cantidad: 1, dias: 1, precioUnitario: 4000, costoUnitario: 4000, subtotal: 4000, esExterno: true },
      { tipo: "EQUIPO_EXTERNO", descripcion: "Centro de carga Lite Tek", cantidad: 1, dias: 1, precioUnitario: 500, costoUnitario: 500, subtotal: 500, esExterno: true },
      // OPERACIÓN TÉCNICA
      { tipo: "OPERACION_TECNICA", descripcion: "Operador de audio", nivel: "OPERADOR DE AUDIO", cantidad: 1, dias: 1, precioUnitario: 1500, costoUnitario: 1500, subtotal: 1500 },
      { tipo: "OPERACION_TECNICA", descripcion: "Operador de iluminación", nivel: "OPERADOR DE ILUMINACIÓN", cantidad: 1, dias: 1, precioUnitario: 1500, costoUnitario: 1500, subtotal: 1500 },
      { tipo: "OPERACION_TECNICA", descripcion: "Stagehand / Staff iluminación", nivel: "STAGEHAND", cantidad: 1, dias: 1, precioUnitario: 1000, costoUnitario: 1000, subtotal: 1000 },
      // COMIDAS
      { tipo: "COMIDA", descripcion: "Comidas del personal (6 comidas × $130)", cantidad: 6, dias: 1, precioUnitario: 130, costoUnitario: 130, subtotal: 780 },
    ],
  },
];

// ── Script principal ────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Iniciando migración en lote (5 cotizaciones)...\n");

  // Buscar vendedor
  const vendedor = await prisma.user.findFirst({
    where: { name: { contains: "Mauricio", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!vendedor) throw new Error("No se encontró usuario Mauricio. Verifica el nombre en la BD.");
  console.log(`✅ Vendedor: ${vendedor.name} (${vendedor.id})\n`);

  const resultados = [];

  for (const proyecto of PROYECTOS) {
    const { cliente: clienteData, trato: tratoData, cotizacion: cotData, lineas } = proyecto;
    console.log(`─── ${clienteData.nombre} ───`);

    // 1. Crear o reutilizar cliente
    let cliente = await prisma.cliente.findFirst({
      where: { nombre: { equals: clienteData.nombre, mode: "insensitive" } },
    });
    if (cliente) {
      console.log(`  ℹ️  Cliente ya existe: ${cliente.id}`);
    } else {
      cliente = await prisma.cliente.create({ data: clienteData });
      console.log(`  ✅ Cliente creado: ${cliente.id}`);
    }

    // 2. Crear trato
    const trato = await prisma.trato.create({
      data: {
        ...tratoData,
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
    console.log(`  ✅ Trato: ${trato.id}`);

    // 3. Número de cotización
    const lastCot = await prisma.cotizacion.findFirst({
      orderBy: { numeroCotizacion: "desc" },
      select: { numeroCotizacion: true },
    });
    const lastNum = lastCot
      ? parseInt(lastCot.numeroCotizacion.replace("COT-", "")) || 0
      : 0;
    const numeroCotizacion = `COT-${String(lastNum + 1).padStart(4, "0")}`;

    // 4. Crear cotización con líneas
    const cotizacion = await prisma.cotizacion.create({
      data: {
        numeroCotizacion,
        tratoId: trato.id,
        clienteId: cliente.id,
        creadaPorId: vendedor.id,
        estado: "BORRADOR",
        opcionLetra: "A",
        ...cotData,
        lineas: {
          create: lineas.map((l, i) => ({
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
            esIncluido: false,
            notas: null,
            esExterno: l.esExterno ?? false,
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

    console.log(`  ✅ Cotización: ${numeroCotizacion} (${cotizacion.id}) — ${cotizacion.lineas.length} líneas — $${cotData.granTotal.toLocaleString("es-MX")}`);
    console.log(`     /crm/tratos/${trato.id}`);
    console.log(`     /cotizaciones/${cotizacion.id}`);

    resultados.push({ nombre: clienteData.nombre, numeroCotizacion, tratoId: trato.id, cotizacionId: cotizacion.id });
    console.log();
  }

  console.log("══════════════════════════════════════════════════════════");
  console.log("✔  Migración completada. Resumen:");
  for (const r of resultados) {
    console.log(`  • ${r.nombre}: ${r.numeroCotizacion}  → /cotizaciones/${r.cotizacionId}`);
  }
}

main()
  .catch(e => { console.error("❌ Error:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
