import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

// Definición completa de todas las entradas de configuración de la plataforma.
// Cada vez que se agrega un valor configurable nuevo, se registra aquí.
// El PUT a /api/admin/config preserva valores existentes y solo actualiza metadatos.
export const CONFIG_SEED = [

  // ── EMPRESA Y CONTACTO ────────────────────────────────────────────────────
  { key: "empresa.nombre",            section: "empresa", label: "Nombre comercial",         type: "text",    orden: 1,  value: "Mainstage Pro",                         description: "Nombre que aparece en presentaciones, portales y PDFs" },
  { key: "empresa.razonSocial",       section: "empresa", label: "Razón social",              type: "text",    orden: 2,  value: "Escenario Principal Producciones",       description: "Razón social fiscal para contratos y documentos legales" },
  { key: "empresa.tagline",           section: "empresa", label: "Tagline principal",         type: "text",    orden: 3,  value: "AUDIO · ILUMINACIÓN · VIDEO · PRODUCCIÓN TÉCNICA", description: "Aparece en el PDF de cotización bajo el nombre" },
  { key: "empresa.taglineSecundario", section: "empresa", label: "Tagline secundario",        type: "text",    orden: 4,  value: "Creamos experiencias que generan impacto.", description: "Aparece en presentaciones y brandbook" },
  { key: "empresa.telefono",          section: "empresa", label: "Teléfono",                  type: "phone",   orden: 5,  value: "4461432565",                            description: "Solo dígitos, sin país" },
  { key: "empresa.whatsapp",          section: "empresa", label: "WhatsApp (con país)",       type: "phone",   orden: 6,  value: "524461432565",                          description: "Con código de país (52 para México). Aparece en 8+ archivos" },
  { key: "empresa.email",             section: "empresa", label: "Email de contacto",         type: "email",   orden: 7,  value: "mainstageqro@gmail.com",                description: "Email principal — actualmente inconsistente en el código" },
  { key: "empresa.sitioWeb",          section: "empresa", label: "Sitio web",                 type: "url",     orden: 8,  value: "mainstagepro.mx",                       description: "Sin https://" },
  { key: "empresa.appUrl",            section: "empresa", label: "URL de la plataforma",      type: "url",     orden: 9,  value: "https://mainstagepro.vercel.app",        description: "URL completa usada en invitaciones a técnicos, portales y reportes" },
  { key: "empresa.ciudad",            section: "empresa", label: "Ciudad sede",               type: "text",    orden: 10, value: "Querétaro",                             description: "Ciudad principal de operaciones" },
  { key: "empresa.estadoPais",        section: "empresa", label: "Estado y país",             type: "text",    orden: 11, value: "Querétaro, México",                     description: "Aparece en portal del cliente y formularios" },
  { key: "empresa.jurisdiccion",      section: "empresa", label: "Jurisdicción legal",        type: "text",    orden: 12, value: "Ciudad de Querétaro, Qro.",             description: "Ciudad para cláusula de jurisdicción en contratos" },
  { key: "empresa.ciudadesCobertura", section: "empresa", label: "Ciudades de cobertura",     type: "text",    orden: 13, value: "Querétaro · San Miguel de Allende · Ciudad de México · El Bajío", description: "Aparece en footer de presentaciones" },
  { key: "empresa.handleInstagram",   section: "empresa", label: "Handle Instagram",          type: "text",    orden: 14, value: "@mainstagepro",                         description: "Aparece en beneficios Trade y brandbook" },
  { key: "empresa.mision",            section: "empresa", label: "Misión",                    type: "textarea",orden: 15, value: "",                                      description: "Texto de misión para brandbook" },
  { key: "empresa.vision",            section: "empresa", label: "Visión",                    type: "textarea",orden: 16, value: "",                                      description: "Texto de visión para brandbook" },
  { key: "reportes.ceoWhatsapp",      section: "empresa", label: "WhatsApp del CEO (reporte)", type: "phone", orden: 17, value: "524461432565",                          description: "Número que recibe el reporte semanal automático" },

  // ── DATOS BANCARIOS ───────────────────────────────────────────────────────
  { key: "banco.fiscal.razonSocial",  section: "banco", label: "Razón social fiscal",        type: "text",    orden: 1,  value: "Escenario Principal Producciones",       description: "Para datos de pago en cotizaciones" },
  { key: "banco.fiscal.rfc",          section: "banco", label: "RFC fiscal",                 type: "text",    orden: 2,  value: "EPP2502068Q8",                           description: "" },
  { key: "banco.fiscal.banco",        section: "banco", label: "Banco fiscal",               type: "text",    orden: 3,  value: "Banorte",                               description: "" },
  { key: "banco.fiscal.cuenta",       section: "banco", label: "No. cuenta fiscal",          type: "text",    orden: 4,  value: "1313102977",                            description: "" },
  { key: "banco.fiscal.clabe",        section: "banco", label: "CLABE fiscal",               type: "text",    orden: 5,  value: "072 680 013131029777",                  description: "" },
  { key: "banco.fiscal.tarjeta",      section: "banco", label: "Tarjeta fiscal",             type: "text",    orden: 6,  value: "4189 2810 0070 3307",                   description: "" },
  { key: "banco.noFiscal.beneficiario",section: "banco",label: "Beneficiario no fiscal",     type: "text",    orden: 7,  value: "Jose Mauricio A. Hernández V.M.",        description: "" },
  { key: "banco.noFiscal.rfc",        section: "banco", label: "RFC no fiscal",              type: "text",    orden: 8,  value: "HEVM9611179YA",                         description: "" },
  { key: "banco.noFiscal.banco",      section: "banco", label: "Banco no fiscal",            type: "text",    orden: 9,  value: "Banorte",                               description: "" },
  { key: "banco.noFiscal.cuenta",     section: "banco", label: "No. cuenta no fiscal",       type: "text",    orden: 10, value: "1314637038",                            description: "" },
  { key: "banco.noFiscal.clabe",      section: "banco", label: "CLABE no fiscal",            type: "text",    orden: 11, value: "072 680 013146370385",                  description: "" },
  { key: "banco.noFiscal.correo",     section: "banco", label: "Correo no fiscal",           type: "email",   orden: 12, value: "mainstageqro@gmail.com",                description: "" },

  // ── PRECIOS Y DESCUENTOS ──────────────────────────────────────────────────
  { key: "precios.iva",               section: "precios", label: "Tasa de IVA",              type: "number",  orden: 1,  value: "0.16",  description: "Ej: 0.16 para 16%. Usado en cotizaciones y cálculos Trade" },
  { key: "precios.descuentoB2b",      section: "precios", label: "Descuento B2B",            type: "number",  orden: 2,  value: "0.10",  description: "Ej: 0.10 para 10%" },
  { key: "precios.vigenciaCotizacion",section: "precios", label: "Vigencia cotización (días)",type: "number", orden: 3,  value: "30",   description: "Días que una cotización tiene validez por defecto" },
  { key: "precios.anticipoPct",       section: "precios", label: "Anticipo default (%)",     type: "number",  orden: 4,  value: "50",   description: "% de anticipo cuando no hay plan de pagos definido" },
  { key: "precios.liquidacionPct",    section: "precios", label: "Liquidación default (%)",  type: "number",  orden: 5,  value: "50",   description: "% de liquidación cuando no hay plan de pagos definido" },
  { key: "precios.viabilidadIdeal",   section: "precios", label: "Viabilidad ideal (margen)",type: "number",  orden: 6,  value: "0.55", description: "Margen mínimo para semáforo verde" },
  { key: "precios.viabilidadRegular", section: "precios", label: "Viabilidad regular",       type: "number",  orden: 7,  value: "0.40", description: "Margen mínimo para semáforo amarillo" },
  { key: "precios.viabilidadMinimo",  section: "precios", label: "Viabilidad mínima",        type: "number",  orden: 8,  value: "0.25", description: "Margen mínimo para semáforo rojo" },
  { key: "precios.descuentosVolumen", section: "precios", label: "Descuentos por volumen",   type: "json",    orden: 9,  value: JSON.stringify([{min:0,max:24999,pct:0},{min:25000,max:49999,pct:5},{min:50000,max:74999,pct:7},{min:75000,max:99999,pct:9},{min:100000,max:null,pct:11}]), description: "Array de rangos: [{min, max, pct}]. max null = sin límite" },
  { key: "precios.descuentosMultidia",section: "precios", label: "Descuentos multidía",      type: "json",    orden: 10, value: JSON.stringify([{dias:1,pct:0},{dias:2,pct:10},{dias:3,pct:15},{dias:4,pct:20},{dias:5,pct:25}]), description: "Array de días: [{dias, pct}]" },

  // ── MAINSTAGE TRADE ───────────────────────────────────────────────────────
  { key: "trade.niveles", section: "trade", label: "Niveles Trade", type: "json", orden: 1, value: JSON.stringify([
    { nivel: 1, nombre: "Base",        tagline: "Visibilidad esencial", pct: 5,  destacado: false, beneficios: ["Logo en materiales digitales del evento", "1 mención en redes sociales", "2 a 4 accesos al evento", "Acceso a métricas de alcance post-evento"] },
    { nivel: 2, nombre: "Estratégico", tagline: "Máximo alcance",       pct: 10, destacado: true,  beneficios: ["Logo en materiales digitales y físicos", "3 menciones en redes + etiqueta en contenido", "4 a 8 accesos al evento", "Repost en @mainstagepro", "Reporte de métricas detallado"] },
    { nivel: 3, nombre: "Premium",     tagline: "Presencia total",      pct: 12, destacado: false, beneficios: ["Logo destacado en todos los materiales", "Cobertura completa en redes sociales", "6 a 12 accesos al evento", "Video recap con branding", "Reporte ejecutivo de impacto"] },
  ]), description: "Define nombres, porcentajes y beneficios de cada nivel. Actualmente duplicado en 3 archivos del código." },

  // ── PROYECTOS Y OPERACIÓN ─────────────────────────────────────────────────
  { key: "proyectos.jornadaCorta",    section: "proyectos", label: "Horas jornada CORTA",    type: "number",  orden: 1, value: "8",  description: "Hasta X horas = jornada CORTA" },
  { key: "proyectos.jornadaMedia",    section: "proyectos", label: "Horas jornada MEDIA",    type: "number",  orden: 2, value: "12", description: "Hasta X horas = jornada MEDIA. Más de esto = LARGA" },
  { key: "proyectos.checklistBase",   section: "proyectos", label: "Checklist producción técnica", type: "json", orden: 3, value: JSON.stringify([
    "Confirmar personal asignado","Confirmar equipos propios","Confirmar equipos externos / proveedores",
    "Confirmar transporte","Confirmar alimentación / catering","Confirmar hospedaje (si aplica)",
    "Confirmar horarios del evento y montaje","Confirmar documentos técnicos (rider, input list, plot)",
    "Confirmar contactos clave del cliente y del lugar",
    "Solicitar a administración presupuesto operativo (gasolinas, emergencia y gastos necesarios)",
    "Solicitar y coordinar catering de producción de acuerdo al número de personal",
    "Cierre financiero preliminar confirmado",
  ]), description: "Lista de ítems del checklist para proyectos de producción técnica" },
  { key: "proyectos.checklistRenta",  section: "proyectos", label: "Checklist renta de equipo", type: "json", orden: 4, value: JSON.stringify([
    "Confirmar lista de equipos a entregar","Verificar inventario y estado del equipo antes de salida",
    "Preparar y revisar hoja de entrega (firmas y cantidades)","Confirmar dirección y horario de entrega",
    "Confirmar fecha y horario de devolución/recolección","Confirmar si el cliente tiene técnico propio (y su contacto)",
    "Confirmar anticipo y condiciones de pago","Confirmar contacto del cliente para el día de entrega",
    "Empacar y etiquetar equipo por bulto","Registrar fotos del equipo al momento de entrega",
    "Obtener firma de responsiva al entregar","Verificar regreso del equipo en buen estado",
    "Cierre financiero confirmado",
  ]), description: "Lista de ítems del checklist para proyectos de renta" },

  // ── ALERTAS Y VENCIMIENTOS ────────────────────────────────────────────────
  { key: "alertas.diasSinPersonal",         section: "alertas", label: "Días alerta sin personal",         type: "number", orden: 1, value: "14", description: "Alerta si un proyecto en X días no tiene personal asignado" },
  { key: "alertas.diasSinEquipo",           section: "alertas", label: "Días alerta sin equipo",           type: "number", orden: 2, value: "7",  description: "Alerta si un proyecto en X días no tiene equipo asignado" },
  { key: "alertas.diasCotizacionSinRespuesta",section:"alertas",label: "Días cotización sin respuesta",    type: "number", orden: 3, value: "7",  description: "Alerta si una cotización enviada no tiene respuesta en X días" },
  { key: "alertas.diasCxcPorVencer",        section: "alertas", label: "Días alerta CxC por vencer",       type: "number", orden: 4, value: "5",  description: "Alerta de cobro próximo a vencer" },
  { key: "alertas.diasCxpPorVencer",        section: "alertas", label: "Días alerta CxP por vencer",       type: "number", orden: 5, value: "3",  description: "Alerta de pago próximo a vencer" },
  { key: "alertas.diasSeguimientoVencido",  section: "alertas", label: "Días seguimiento vencido CRM",     type: "number", orden: 6, value: "2",  description: "Alerta de trato con seguimiento vencido hace X días" },
  { key: "alertas.diasSinAnticipo",         section: "alertas", label: "Días alerta sin anticipo",         type: "number", orden: 7, value: "14", description: "Alerta si un proyecto en X días no tiene anticipo cobrado" },
  { key: "alertas.cajaChicaUmbral",         section: "alertas", label: "Umbral saldo caja chica ($)",      type: "number", orden: 8, value: "1000", description: "Monto mínimo antes de disparar alerta de caja chica" },
  { key: "alertas.cajaChicaUsuarioId",      section: "alertas", label: "ID usuario alerta caja chica",     type: "text",   orden: 9, value: "cmo7ikcc00000oqfsqwzys8g4", description: "ID del usuario que recibe notificaciones de saldo bajo" },
  { key: "alertas.diasProyectoSinEvaluar",  section: "alertas", label: "Días proyecto completado sin evaluar",type:"number",orden:10,value: "30", description: "Alerta si un proyecto completado no fue evaluado en X días" },

  // ── INVENTARIO ────────────────────────────────────────────────────────────
  { key: "inventario.diasInactividad1",   section: "inventario", label: "Alerta inactividad leve (días)",   type: "number", orden: 1, value: "30",  description: "Equipo sin rentar por X días → alerta INACTIVO_1M" },
  { key: "inventario.diasInactividad2",   section: "inventario", label: "Alerta inactividad media (días)",  type: "number", orden: 2, value: "90",  description: "Equipo sin rentar por X días → alerta INACTIVO_3M" },
  { key: "inventario.diasInactividad3",   section: "inventario", label: "Alerta inactividad alta (días)",   type: "number", orden: 3, value: "180", description: "Equipo sin rentar por X días → alerta INACTIVO_6M" },
  { key: "inventario.rentasParaInversion",section: "inventario", label: "Rentas mínimas para sugerir compra",type:"number",orden: 4, value: "2",   description: "Si un equipo externo se renta X+ veces, se marca como candidato a comprar" },

  // ── PLANTILLAS DE MENSAJES ────────────────────────────────────────────────
  { key: "plantillas.whatsappTecnico",    section: "plantillas", label: "Invitación a técnico (WhatsApp)",   type: "textarea", orden: 1, value: "Hola {nombre}, te invitamos al proyecto *{proyecto}* el {fecha} en {lugar}.\n\nConfirma tu participación aquí: {url}", description: "Variables: {nombre}, {proyecto}, {fecha}, {lugar}, {url}" },
  { key: "plantillas.whatsappProveedor",  section: "plantillas", label: "Invitación a proveedor (WhatsApp)", type: "textarea", orden: 2, value: "Hola {nombre}, requerimos tu equipo para el proyecto *{proyecto}* el {fecha}.\n\nConfirma disponibilidad aquí: {url}", description: "Variables: {nombre}, {proyecto}, {fecha}, {url}" },
  { key: "plantillas.seguimientoMusical", section: "plantillas", label: "Seguimiento — Evento musical",      type: "textarea", orden: 3, value: "Hola {nombre}, buen día.\n\nTe escribo de *Mainstage Pro*, producción técnica de audio, iluminación y video con base en Querétaro.\n\nQuería dar seguimiento a tu cotización para {evento}. ¿Tienes alguna duda o ajuste? Con gusto te apoyo.\n\nSaludos,\n{vendedor}", description: "Variables: {nombre}, {evento}, {vendedor}" },
  { key: "plantillas.seguimientoSocial",  section: "plantillas", label: "Seguimiento — Evento social",       type: "textarea", orden: 4, value: "Hola {nombre}! Espero estés muy bien 😊\n\nTe escribo para dar seguimiento a la cotización de tu evento. ¿Cómo lo ves? ¿Tienes alguna pregunta?\n\nQuedamos al pendiente,\n{vendedor}", description: "Variables: {nombre}, {evento}, {vendedor}" },
  { key: "plantillas.seguimientoEmpresarial",section:"plantillas",label:"Seguimiento — Evento empresarial", type: "textarea", orden: 5, value: "Estimado/a {nombre},\n\nEspero se encuentre bien. Le escribo para dar seguimiento a la propuesta técnica que enviamos para {evento}.\n\nQuedo a sus órdenes para cualquier ajuste.\n\nAtentamente,\n{vendedor} | Mainstage Pro", description: "Variables: {nombre}, {evento}, {vendedor}" },
  { key: "plantillas.reciboAgradecimiento",section:"plantillas", label: "Mensaje de agradecimiento en recibo", type: "textarea", orden: 6, value: "¡Gracias por su pago! Su cuenta ha quedado liquidada en su totalidad. Ha sido un placer trabajar con usted. Esperamos volver a colaborar pronto. — Equipo Mainstage Pro", description: "Aparece en el PDF del recibo de liquidación" },

  // ── CONTRATOS Y DOCUMENTOS ────────────────────────────────────────────────
  { key: "contratos.anticipoPctRenta",     section: "contratos", label: "Anticipo % en contratos de renta", type: "number", orden: 1, value: "50", description: "% de anticipo en cláusula del contrato de renta" },
  { key: "contratos.diasPosponer",         section: "contratos", label: "Días para posponer fecha",         type: "number", orden: 2, value: "14", description: "Mínimo de días de anticipación para posponer evento" },
  { key: "contratos.mesesReagendar",       section: "contratos", label: "Meses para reagendar",             type: "number", orden: 3, value: "12", description: "Ventana de meses para reagendar antes de considerarse cancelación" },
  { key: "contratos.diasNotificarDanos",   section: "contratos", label: "Días para notificar daños",        type: "number", orden: 4, value: "5",  description: "Días para reportar daños al equipo tras devolución" },
  { key: "contratos.diasSolicitudExtra",   section: "contratos", label: "Días para solicitar extras",       type: "number", orden: 5, value: "3",  description: "Anticipación mínima para solicitar servicios adicionales" },
  { key: "contratos.hervamDiaVencimiento", section: "contratos", label: "Día vencimiento HERVAM",           type: "number", orden: 6, value: "10", description: "Día del mes en que vence el pago mensual de HERVAM" },
  { key: "contratos.socios.diasReporte",   section: "contratos", label: "Días hábiles emisión reporte socio",type:"number", orden: 7, value: "5",  description: "Días hábiles para emitir reporte mensual al socio" },
  { key: "contratos.socios.diasPago",      section: "contratos", label: "Días para pago al socio",          type: "number", orden: 8, value: "15", description: "Días naturales para pagar al socio tras aprobación del reporte" },
  { key: "contratos.socios.diasTerminacion",section:"contratos", label: "Días preaviso terminación",        type: "number", orden: 9, value: "60", description: "Días de anticipación para terminación anticipada del contrato" },
  { key: "contratos.socios.mesesConfidencialidad",section:"contratos",label:"Meses confidencialidad post-término",type:"number",orden:10,value:"24",description:"Período de confidencialidad tras terminar contrato de socio"},
];

export async function POST() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const res = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/admin/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: "" },
    body: JSON.stringify({ entries: CONFIG_SEED }),
  });

  if (!res.ok) return NextResponse.json({ error: "Error al ejecutar seed" }, { status: 500 });
  const data = await res.json();
  return NextResponse.json({ ok: true, ...data });
}
