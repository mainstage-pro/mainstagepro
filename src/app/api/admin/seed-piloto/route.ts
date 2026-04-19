import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "mainstage-piloto-2025";

function auth(req: NextRequest) {
  return req.headers.get("x-seed-secret") === SECRET;
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [primerUsuario, roles] = await Promise.all([
    prisma.user.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.rolTecnico.findMany({ orderBy: { orden: "asc" } }),
  ]);
  if (!primerUsuario) return NextResponse.json({ error: "No hay usuarios" }, { status: 400 });

  const rolById = (kw: string) => roles.find(r => r.nombre.toLowerCase().includes(kw))?.id ?? null;
  const rolProduccion = rolById("producci");
  const rolAudio      = rolById("audio");
  const rolIlum       = rolById("iluminaci");
  const rolStage      = rolById("stagehand") ?? rolById("técnico /");

  const tradeToken = `trade-nexo-${Date.now()}`;

  try {
  const cliente = await prisma.cliente.create({
    data: {
      nombre: "Rodrigo Villanueva",
      empresa: "Nexo Eventos",
      telefono: "524422019876",
      correo: "rodrigo@nexoeventos.mx",
      tipoCliente: "B2B",
      clasificacion: "REGULAR",
      servicioUsual: "PRODUCCION_TECNICA",
      notas: "Productor independiente. Primer evento con Mainstage. Muy interesado en el esquema Trade para reducir costo.",
    },
  });

  const trato = await prisma.trato.create({
    data: {
      clienteId: cliente.id,
      responsableId: primerUsuario.id,
      etapa: "VENTA_CERRADA",
      tipoEvento: "SOCIAL",
      tipoServicio: "PRODUCCION_TECNICA",
      tipoProspecto: "ACTIVO",
      tipoLead: "INBOUND",
      origenLead: "REFERIDO",
      origenVenta: "CLIENTE_PROPIO",
      canalAtencion: "WHATSAPP",
      lugarEstimado: "Jardín Villa del Rey, Querétaro",
      fechaEventoEstimada: new Date("2025-07-05"),
      presupuestoEstimado: 60000,
      asistentesEstimados: 200,
      duracionEvento: "7 horas (17:00 a 00:00 hrs)",
      nombreEvento: "Boda Sofía & Marcos",
      serviciosInteres: JSON.stringify(["Audio profesional", "Iluminación decorativa", "DJ"]),
      ideasReferencias: "Ambiente romántico, iluminación cálida tipo bistro, sistema de audio para ceremonia y recepción con DJ al final.",
      descubrimientoCompleto: true,
      notas: "Rodrigo organiza la boda de un familiar. Presupuesto ajustado — califica perfectamente para Trade. Ya revisó los niveles y está interesado en Nivel 2.",
      horaInicioEvento: "17:00",
      horaFinEvento: "00:00",
      horaTerminoMontaje: "16:30",
      duracionMontajeHrs: 3,
      ventanaMontajeInicio: "13:00",
      ventanaMontajeFin: "16:30",
      contactoVenueNombre: "Sra. Carmen Ortiz",
      contactoVenueTelefono: "524421556677",
      tradeCalificado: true,
      tradeNivel: 2,
      familyAndFriends: false,
      etapaCambiadaEn: new Date("2025-04-19"),
      fechaCierre: new Date("2025-04-19"),
      scoutingData: JSON.stringify({
        nombreVenue: "Jardín Villa del Rey",
        direccion: "Camino a Mompaní 45, El Marqués, Querétaro",
        largo: 30,
        ancho: 20,
        alturaMaxima: 4,
        voltajeDisponible: "127V",
        amperajeTotalDisponible: "100A",
        restriccionDecibeles: "No especificado",
        restriccionHorarioAcceso: "13:00 hrs",
        accesoVehicular: "Acceso directo al jardín por puerta trasera",
        notasScouting: "Jardín al aire libre, área techada en una sección. Hay tomacorrientes en pérgola principal.",
      }),
    },
  });

  const year = new Date().getFullYear();
  const cotCount = await prisma.cotizacion.count({ where: { numeroCotizacion: { startsWith: `COT-${year}-` } } });
  const numeroCotizacion = `COT-${year}-${String(cotCount + 1).padStart(3, "0")}-T`;

  const cot = await prisma.cotizacion.create({
    data: {
      numeroCotizacion,
      tratoId: trato.id,
      clienteId: cliente.id,
      creadaPorId: primerUsuario.id,
      estado: "ENVIADA",
      tipoServicio: "PRODUCCION_TECNICA",
      tipoEvento: "SOCIAL",
      nombreEvento: "Boda Sofía & Marcos",
      fechaEvento: new Date("2025-07-05"),
      lugarEvento: "Jardín Villa del Rey, El Marqués, Querétaro",
      diasEquipo: 1,
      diasOperacion: 1,
      horasOperacion: 11,
      observaciones: "Sistema de audio para ceremonia (micrófonos inalámbricos) + recepción. DJ con equipo propio, solo se conecta al sistema. Iluminación decorativa tipo bistro + luces de colores para pista de baile.",
      descuentoTotalPct: 0,
      montoDescuento: 0,
      subtotalEquiposBruto: 28000,
      subtotalEquiposNeto: 28000,
      subtotalPaquetes: 0,
      subtotalTerceros: 0,
      subtotalOperacion: 14500,
      subtotalTransporte: 1800,
      subtotalComidas: 1200,
      subtotalHospedaje: 0,
      total: 45500,
      aplicaIva: true,
      montoIva: 7280,
      granTotal: 52780,
      costosTotalesEstimados: 28000,
      utilidadEstimada: 17500,
      porcentajeUtilidad: 38.5,
      tradeToken,
      planPagos: JSON.stringify({
        esquema: "PERSONALIZADO",
        pagos: [
          { concepto: "Anticipo 50% — ", porcentaje: 50, diasAntes: 30, tipoPago: "ANTICIPO" },
          { concepto: "Liquidación 50% — ", porcentaje: 50, diasAntes: 1, tipoPago: "LIQUIDACION" },
        ],
      }),
      lineas: {
        create: [
          { tipo: "EQUIPO_PROPIO", orden: 0,  descripcion: "Sistema de audio Line Array compacto (par)",   cantidad: 1, dias: 1, precioUnitario: 8500, costoUnitario: 0, subtotal: 8500,  esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 1,  descripcion: "Consola digital 16 canales",                   cantidad: 1, dias: 1, precioUnitario: 3200, costoUnitario: 0, subtotal: 3200,  esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 2,  descripcion: "Micrófonos inalámbricos de solapa",            cantidad: 2, dias: 1, precioUnitario: 800,  costoUnitario: 0, subtotal: 1600,  esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 3,  descripcion: "Micrófono de mano inalámbrico",               cantidad: 1, dias: 1, precioUnitario: 700,  costoUnitario: 0, subtotal: 700,   esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 4,  descripcion: "Luminarias LED tipo bistro (guirnalda 20m)",  cantidad: 4, dias: 1, precioUnitario: 1200, costoUnitario: 0, subtotal: 4800,  esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 5,  descripcion: "Wash LED RGBW para pista de baile",           cantidad: 6, dias: 1, precioUnitario: 900,  costoUnitario: 0, subtotal: 5400,  esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 6,  descripcion: "Par LED blanco para iluminación de mesas",   cantidad: 8, dias: 1, precioUnitario: 475,  costoUnitario: 0, subtotal: 3800,  esExterno: false, esIncluido: false },
          ...(rolProduccion ? [{ tipo: "OPERACION_TECNICA", orden: 7,  descripcion: "Production Manager",    nivel: "AA",  jornada: "MEDIA", cantidad: 1, dias: 1, precioUnitario: 3000, costoUnitario: 0, subtotal: 3000, esExterno: false, esIncluido: false, rolTecnicoId: rolProduccion }] : []),
          ...(rolAudio      ? [{ tipo: "OPERACION_TECNICA", orden: 8,  descripcion: "Operador de Audio AA",  nivel: "AA",  jornada: "MEDIA", cantidad: 1, dias: 1, precioUnitario: 2300, costoUnitario: 0, subtotal: 2300, esExterno: false, esIncluido: false, rolTecnicoId: rolAudio      }] : []),
          ...(rolIlum       ? [{ tipo: "OPERACION_TECNICA", orden: 9,  descripcion: "Operador de Iluminación AA", nivel: "AA", jornada: "MEDIA", cantidad: 1, dias: 1, precioUnitario: 2300, costoUnitario: 0, subtotal: 2300, esExterno: false, esIncluido: false, rolTecnicoId: rolIlum  }] : []),
          ...(rolStage      ? [{ tipo: "OPERACION_TECNICA", orden: 10, descripcion: "Stage Hand AA",         nivel: "AA",  jornada: "MEDIA", cantidad: 2, dias: 1, precioUnitario: 1200, costoUnitario: 0, subtotal: 2400, esExterno: false, esIncluido: false, rolTecnicoId: rolStage     }] : []),
          { tipo: "TRANSPORTE",   orden: 11, descripcion: "Flete redondo Querétaro local",               cantidad: 1, dias: 1, precioUnitario: 1800, costoUnitario: 1200, subtotal: 1800, esExterno: false, esIncluido: false },
          { tipo: "ALIMENTACION", orden: 12, descripcion: "Catering personal técnico (5 personas)",       cantidad: 5, dias: 1, precioUnitario: 240,  costoUnitario: 0,    subtotal: 1200, esExterno: false, esIncluido: false },
        ],
      },
    },
  });

  return NextResponse.json({
    ok: true,
    ids: { clienteId: cliente.id, tratoId: trato.id, cotizacionId: cot.id },
    numeroCotizacion,
    tradeUrl: `/trade/${tradeToken}`,
    mensaje: "✅ Trato Trade creado. Cotización en estado ENVIADA con tradeToken activo.",
  });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cliente = await prisma.cliente.findFirst({ where: { correo: "rodrigo@nexoeventos.mx" } });
  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const cots = await prisma.cotizacion.findMany({ where: { clienteId: cliente.id }, select: { id: true } });
  const cotIds = cots.map(c => c.id);
  const tratos = await prisma.trato.findMany({ where: { clienteId: cliente.id }, select: { id: true } });
  const tratoIds = tratos.map(t => t.id);

  await prisma.$transaction(async (tx) => {
    if (cotIds.length) await tx.cotizacionLinea.deleteMany({ where: { cotizacionId: { in: cotIds } } });
    if (cotIds.length) await tx.cotizacion.deleteMany({ where: { id: { in: cotIds } } });
    if (tratoIds.length) await tx.trato.deleteMany({ where: { id: { in: tratoIds } } });
    await tx.cliente.delete({ where: { id: cliente.id } });
  });

  return NextResponse.json({ ok: true, mensaje: "🗑 Trato Trade piloto eliminado." });
}
