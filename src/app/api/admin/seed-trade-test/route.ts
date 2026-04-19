import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TEMP — Single-use endpoint. DELETE after seeding.

const SECRET = "mainstage-piloto-2025";
const COT_NUM = "COT-2026-TRADE-01";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-seed-secret") !== SECRET)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Idempotency check
  const existing = await prisma.cotizacion.findUnique({ where: { numeroCotizacion: COT_NUM } });
  if (existing) return NextResponse.json({ ok: true, msg: "Ya existe", cotizacionId: existing.id });

  // Find or create client
  let cliente = await prisma.cliente.findFirst({ where: { correo: "rodrigo@nexoeventos.mx" } });
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        nombre: "Rodrigo Villanueva",
        correo: "rodrigo@nexoeventos.mx",
        telefono: "+52 442 555 1234",
        empresa: "Nexo Eventos",
        notas: "Cliente VIP — registro de prueba Trade",
      },
    });
  }

  // Create trato
  const trato = await prisma.trato.create({
    data: {
      clienteId: cliente.id,
      tipoEvento: "SOCIAL",
      tipoLead: "INBOUND",
      origenLead: "RECOMPRA",
      etapa: "OPORTUNIDAD",
      clasificacion: "PRIORITY",
      tipoServicio: "PRODUCCION_TECNICA",
      canalAtencion: "REUNION",
      nombreEvento: "Boda Sofía & Marcos",
      duracionEvento: "8 horas",
      asistentesEstimados: 320,
      serviciosInteres: JSON.stringify(["AUDIO_PA", "ILUMINACION", "VIDEO_LED", "BACKLINE"]),
      ideasReferencias: "Boda elegante con pantallas LED laterales y ambiente íntimo",
      rutaEntrada: "DESCUBRIR",
      continuarPor: "COTIZACION",
      descubrimientoCompleto: true,
      lugarEstimado: "Hacienda San Gabriel de las Palmas, Morelos",
      fechaEventoEstimada: new Date("2026-06-14T18:00:00.000Z"),
      presupuestoEstimado: 180000,
      notas: "Boda de alto perfil. Sofía es hija del director de una empresa constructora local. Quieren pantallas LED en ambos laterales del altar, audio premium y coordinación técnica completa.",
      proximaAccion: "Enviar propuesta Trade para cierre",
      fechaProximaAccion: new Date("2026-04-25T10:00:00.000Z"),
      horaInicioEvento: "18:00",
      horaFinEvento: "02:00",
      duracionMontajeHrs: 6,
      ventanaMontajeInicio: "10:00",
      ventanaMontajeFin: "16:00",
      horaTerminoMontaje: "04:00",
      contactoVenueNombre: "Lupita Carranza",
      contactoVenueTelefono: "+52 777 200 4501",
      tradeCalificado: true,
    },
  });

  // Financials
  const subtotalEquiposBruto = 142000;
  const subtotalOperacion = 18500;
  const subtotalTransporte = 4800;
  const subtotalComidas = 2400;
  const subtotalHospedaje = 3200;
  const total = subtotalEquiposBruto + subtotalOperacion + subtotalTransporte + subtotalComidas + subtotalHospedaje;
  const montoIva = Math.round(total * 0.16 * 100) / 100;
  const granTotal = Math.round((total + montoIva) * 100) / 100;

  const tradeData = {
    activo: false,
    pct: 5,
    entregables: [
      "Coordinación técnica 100% Mainstage el día del evento",
      "Sistema de audio line-array L-Acoustics calibrado para el venue",
      "Pantallas LED 3x4m en ambos laterales del altar",
      "Iluminación arquitectónica y de ambiente personalizada",
      "Técnico de mezcla con experiencia en bodas de alto perfil",
    ],
    checklist: {},
    checklistCompleto: true,
    nivelSeleccionado: null,
    nivelAplicado: null,
    bonoVariable: null,
    clienteSeleccionoEn: null,
  };

  const cot = await prisma.cotizacion.create({
    data: {
      numeroCotizacion: COT_NUM,
      tratoId: trato.id,
      clienteId: cliente.id,
      estado: "ENVIADA",
      nombreEvento: "Boda Sofía & Marcos",
      tipoEvento: "SOCIAL",
      tipoServicio: "PRODUCCION_TECNICA",
      fechaEvento: new Date("2026-06-14T18:00:00.000Z"),
      lugarEvento: "Hacienda San Gabriel de las Palmas, Morelos",
      horasOperacion: 8,
      tipoJornada: "LARGA",
      diasEquipo: 1,
      diasOperacion: 1,
      diasTransporte: 1,
      diasHospedaje: 1,
      diasComidas: 1,
      subtotalEquiposBruto,
      montoDescuento: 0,
      subtotalEquiposNeto: subtotalEquiposBruto,
      subtotalOperacion,
      subtotalTransporte,
      subtotalComidas,
      subtotalHospedaje,
      total,
      aplicaIva: true,
      montoIva,
      granTotal,
      tradeToken: `trade-test-${Date.now()}`,
      mainstageTradeData: JSON.stringify(tradeData),
      observaciones: "Propuesta de prueba para piloto Mainstage Trade. Cliente calificado Priority.",
      terminosComerciales: "50% anticipo al confirmar, 50% restante 7 días antes del evento.",
      vigenciaDias: 30,
      fechaEnvio: new Date(),
      lineas: {
        create: [
          { tipo: "EQUIPO_PROPIO", descripcion: "Sistema Line-Array L-Acoustics KARA II (8+2 elementos por lado)", cantidad: 1, precioUnitario: 38000, subtotal: 38000, orden: 1 },
          { tipo: "EQUIPO_PROPIO", descripcion: "Consola Yamaha CL5 + técnico de mezcla especializado", cantidad: 1, precioUnitario: 18000, subtotal: 18000, orden: 2 },
          { tipo: "EQUIPO_PROPIO", descripcion: "Moving heads Claypaky Sharpy 300 (12 unidades)", cantidad: 1, precioUnitario: 28000, subtotal: 28000, orden: 3 },
          { tipo: "EQUIPO_PROPIO", descripcion: "Wash LED RGBW Elation Fuze Wash 700 (16 unidades) — arquitectónica", cantidad: 1, precioUnitario: 22000, subtotal: 22000, orden: 4 },
          { tipo: "EQUIPO_PROPIO", descripcion: "Pantallas LED 3x4m laterales con procesador Novastar (2 módulos)", cantidad: 2, precioUnitario: 18000, subtotal: 36000, orden: 5 },
        ],
      },
    },
  });

  return NextResponse.json({
    ok: true,
    clienteId: cliente.id,
    tratoId: trato.id,
    cotizacionId: cot.id,
    numeroCotizacion: COT_NUM,
    tradeUrl: `https://mainstagepro.vercel.app/trade/${cot.tradeToken}`,
    granTotal,
  });
}
