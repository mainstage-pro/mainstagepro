import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Endpoint temporal para crear datos piloto de prueba — eliminar después de usar
export async function POST(req: NextRequest) {
  const session = await getSession();
  const secret = req.headers.get("x-seed-secret");
  if (!session && secret !== "mainstage-piloto-2025") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [primerUsuario, roles, equipos] = await Promise.all([
    prisma.user.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.rolTecnico.findMany({ orderBy: { orden: "asc" } }),
    prisma.equipo.findMany({ take: 40, orderBy: { descripcion: "asc" }, select: { id: true, descripcion: true, categoriaId: true } }),
  ]);

  if (!primerUsuario) return NextResponse.json({ error: "No hay usuarios" }, { status: 400 });

  const rolById = (kw: string) => roles.find(r => r.nombre.toLowerCase().includes(kw))?.id ?? null;
  const rolProduccion  = rolById("producci");
  const rolCoord       = rolById("coord");
  const rolAudio       = rolById("audio");
  const rolIlum        = rolById("iluminaci");
  const rolVideo       = rolById("video");
  const rolStage       = rolById("stagehand") ?? rolById("técnico /");
  const rolSupervision = rolById("supervisi");

  // ── 1. CLIENTE ────────────────────────────────────────────────────────────
  const cliente = await prisma.cliente.create({
    data: {
      nombre: "Daniela Reyes",
      empresa: "Grupo Arenas",
      telefono: "524421890234",
      correo: "daniela.reyes@grupoarenas.mx",
      tipoCliente: "B2B",
      clasificacion: "PRIORITY",
      servicioUsual: "PRODUCCION_TECNICA",
      notas: "Directora de eventos corporativos. 3-4 eventos/año. Exigente con puntualidad y calidad de audio.",
    },
  });

  // ── 2. TRATO ──────────────────────────────────────────────────────────────
  const trato = await prisma.trato.create({
    data: {
      clienteId: cliente.id,
      responsableId: primerUsuario.id,
      etapa: "VENTA_CERRADA",
      tipoEvento: "CORPORATIVO",
      tipoServicio: "PRODUCCION_TECNICA",
      tipoProspecto: "ACTIVO",
      tipoLead: "INBOUND",
      origenLead: "REFERIDO",
      origenVenta: "CLIENTE_PROPIO",
      canalAtencion: "WHATSAPP",
      lugarEstimado: "Centro de Convenciones Querétaro",
      fechaEventoEstimada: new Date("2025-06-14"),
      presupuestoEstimado: 95000,
      asistentesEstimados: 350,
      duracionEvento: "9 horas (10:00 a 19:00 hrs)",
      nombreEvento: "Convención Anual Grupo Arenas 2025",
      serviciosInteres: JSON.stringify(["Audio profesional", "Iluminación arquitectónica", "Video y pantallas LED", "Coordinación técnica"]),
      ideasReferencias: "Estilo TED con pantalla LED detrás del escenario, iluminación ambiental cálida, zona de networking con música ambiente. Similar al evento OMNI del año pasado.",
      etapaContratacion: "PROPUESTA_ENVIADA",
      descubrimientoCompleto: true,
      notas: "Cliente satisfecha con reunión inicial. Presupuesto confirmado hasta $95k. Prioridad: audio crystal clear para ponencia magistral del CEO. Evento de premiación interna al final.",
      proximaAccion: "Confirmar firma de contrato",
      fechaProximaAccion: new Date("2025-04-25"),
      etapaCambiadaEn: new Date("2025-04-18"),
      fechaCierre: new Date("2025-04-18"),
      horaInicioEvento: "10:00",
      horaFinEvento: "19:00",
      horaTerminoMontaje: "20:00",
      duracionMontajeHrs: 4,
      ventanaMontajeInicio: "06:00",
      ventanaMontajeFin: "09:30",
      contactoVenueNombre: "Ing. Roberto Salinas",
      contactoVenueTelefono: "524421334455",
      tradeCalificado: true,
      tradeNivel: 2,
      familyAndFriends: false,
      scoutingData: JSON.stringify({
        nombreVenue: "Centro de Convenciones Querétaro — Salón Imperial",
        direccion: "Av. Constituyentes 1 Sur, Centro Histórico, Querétaro, Qro.",
        largo: 40,
        ancho: 25,
        alturaMaxima: 6,
        fases: "Trifásico",
        voltajeDisponible: "220V",
        amperajeTotalDisponible: "200A",
        restriccionDecibeles: "95 dB máximo",
        restriccionHorarioAcceso: "6:00 AM entrada personal técnico",
        restriccionInstalacion: "No anclar al techo, solo bases estructurales",
        accesoVehicular: "Rampa trasera lado norte, altura máxima 3.5m",
        notasScouting: "Venue propio del corporativo. Seguridad disponible todo el día. Almacén para casos. A/C central.",
      }),
    },
  });

  // ── 3. COTIZACIÓN ─────────────────────────────────────────────────────────
  const year = new Date().getFullYear();
  const cotCount = await prisma.cotizacion.count({ where: { numeroCotizacion: { startsWith: `COT-${year}-` } } });
  const numeroCotizacion = `COT-${year}-${String(cotCount + 1).padStart(3, "0")}`;

  const primerEquipoId = equipos[0]?.id ?? null;

  const cot = await prisma.cotizacion.create({
    data: {
      numeroCotizacion,
      tratoId: trato.id,
      clienteId: cliente.id,
      creadaPorId: primerUsuario.id,
      estado: "APROBADA",
      tipoServicio: "PRODUCCION_TECNICA",
      tipoEvento: "CORPORATIVO",
      nombreEvento: "Convención Anual Grupo Arenas 2025",
      fechaEvento: new Date("2025-06-14"),
      lugarEvento: "Centro de Convenciones Querétaro — Salón Imperial",
      diasEquipo: 1,
      diasOperacion: 1,
      horasOperacion: 13,
      observaciones: "Montaje desde 06:00 AM. Desmontaje inmediato al cierre (19:00 hrs). Todo el personal visible con ropa formal negra. Se incluye coordinador técnico de sitio durante todo el evento.",
      descuentoB2bPct: 5,
      descuentoTotalPct: 5,
      montoDescuento: 2250,
      subtotalEquiposBruto: 45000,
      subtotalEquiposNeto: 42750,
      subtotalPaquetes: 0,
      subtotalTerceros: 0,
      subtotalOperacion: 32000,
      subtotalTransporte: 3500,
      subtotalComidas: 2400,
      subtotalHospedaje: 0,
      total: 80650,
      aplicaIva: true,
      montoIva: 12904,
      granTotal: 93554,
      costosTotalesEstimados: 52000,
      utilidadEstimada: 28650,
      porcentajeUtilidad: 35.5,
      planPagos: JSON.stringify({
        esquema: "PERSONALIZADO",
        pagos: [
          { concepto: "Anticipo 50% — ", porcentaje: 50, diasAntes: 30, tipoPago: "ANTICIPO" },
          { concepto: "Liquidación 50% — ", porcentaje: 50, diasAntes: 1, tipoPago: "LIQUIDACION" },
        ],
      }),
      lineas: {
        create: [
          { tipo: "EQUIPO_PROPIO", orden: 0,  descripcion: "Sistema Line Array 12\" + Sub 18\" (par)",    cantidad: 2, dias: 1, precioUnitario: 6500, costoUnitario: 0, subtotal: 13000, esExterno: false, esIncluido: false, equipoId: primerEquipoId },
          { tipo: "EQUIPO_PROPIO", orden: 1,  descripcion: "Consola digital 32 canales",                  cantidad: 1, dias: 1, precioUnitario: 4500, costoUnitario: 0, subtotal: 4500,  esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 2,  descripcion: "Monitores de piso activos (par)",              cantidad: 2, dias: 1, precioUnitario: 1800, costoUnitario: 0, subtotal: 3600,  esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 3,  descripcion: "Luminaria LED RGBW wash 200W",                cantidad: 12,dias: 1, precioUnitario: 900,  costoUnitario: 0, subtotal: 10800, esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 4,  descripcion: "Pantalla LED P3.9 (3m × 2m)",                 cantidad: 1, dias: 1, precioUnitario: 8500, costoUnitario: 0, subtotal: 8500,  esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 5,  descripcion: "Proyector 10,000 lm + pantalla de 4m",        cantidad: 1, dias: 1, precioUnitario: 2800, costoUnitario: 0, subtotal: 2800,  esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 6,  descripcion: "Podio con micrófono condensador",             cantidad: 1, dias: 1, precioUnitario: 1200, costoUnitario: 0, subtotal: 1200,  esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 7,  descripcion: "Micrófonos inalámbricos de solapa",            cantidad: 4, dias: 1, precioUnitario: 800,  costoUnitario: 0, subtotal: 3200,  esExterno: false, esIncluido: false },
          { tipo: "EQUIPO_PROPIO", orden: 8,  descripcion: "Subwoofers doble 18\" (par)",                  cantidad: 2, dias: 1, precioUnitario: 800,  costoUnitario: 0, subtotal: 1600,  esExterno: false, esIncluido: false },
          ...(rolProduccion  ? [{ tipo: "OPERACION_TECNICA", orden: 9,  descripcion: "Production Manager",       nivel: "AA",  jornada: "LARGA",  cantidad: 1, dias: 1, precioUnitario: 5000, costoUnitario: 0, subtotal: 5000,  esExterno: false, esIncluido: false, rolTecnicoId: rolProduccion  }] : []),
          ...(rolCoord       ? [{ tipo: "OPERACION_TECNICA", orden: 10, descripcion: "Coordinador de Producción",nivel: "AA",  jornada: "LARGA",  cantidad: 1, dias: 1, precioUnitario: 3000, costoUnitario: 0, subtotal: 3000,  esExterno: false, esIncluido: false, rolTecnicoId: rolCoord       }] : []),
          ...(rolSupervision ? [{ tipo: "OPERACION_TECNICA", orden: 11, descripcion: "Supervisor Técnico",        nivel: "AA",  jornada: "LARGA",  cantidad: 1, dias: 1, precioUnitario: 1500, costoUnitario: 0, subtotal: 1500,  esExterno: false, esIncluido: false, rolTecnicoId: rolSupervision }] : []),
          ...(rolAudio       ? [{ tipo: "OPERACION_TECNICA", orden: 12, descripcion: "Operador de Audio AAA",    nivel: "AAA", jornada: "LARGA",  cantidad: 1, dias: 1, precioUnitario: 3200, costoUnitario: 0, subtotal: 3200,  esExterno: false, esIncluido: false, rolTecnicoId: rolAudio       }] : []),
          ...(rolIlum        ? [{ tipo: "OPERACION_TECNICA", orden: 13, descripcion: "Operador de Iluminación AA",nivel: "AA", jornada: "LARGA",  cantidad: 1, dias: 1, precioUnitario: 2600, costoUnitario: 0, subtotal: 2600,  esExterno: false, esIncluido: false, rolTecnicoId: rolIlum        }] : []),
          ...(rolVideo       ? [{ tipo: "OPERACION_TECNICA", orden: 14, descripcion: "Operador de Video AA",     nivel: "AA",  jornada: "LARGA",  cantidad: 1, dias: 1, precioUnitario: 2600, costoUnitario: 0, subtotal: 2600,  esExterno: false, esIncluido: false, rolTecnicoId: rolVideo       }] : []),
          ...(rolStage       ? [
            { tipo: "OPERACION_TECNICA", orden: 15, descripcion: "Stage Hand AA",                          nivel: "AA",  jornada: "LARGA",  cantidad: 4, dias: 1, precioUnitario: 1500, costoUnitario: 0, subtotal: 6000,  esExterno: false, esIncluido: false, rolTecnicoId: rolStage },
          ] : []),
          { tipo: "TRANSPORTE",    orden: 16, descripcion: "Flete redondo CDMX–Querétaro camión 3.5T",    cantidad: 1, dias: 1, precioUnitario: 3500, costoUnitario: 2200, subtotal: 3500, esExterno: false, esIncluido: false },
          { tipo: "ALIMENTACION",  orden: 17, descripcion: "Catering personal técnico (8 personas × día)", cantidad: 8, dias: 1, precioUnitario: 300,  costoUnitario: 0,    subtotal: 2400, esExterno: false, esIncluido: false },
        ],
      },
    },
  });

  // ── 4. PROYECTO ───────────────────────────────────────────────────────────
  const proyCount = await prisma.proyecto.count({ where: { numeroProyecto: { startsWith: `PRY-${year}-` } } });
  const numeroProyecto = `PRY-${year}-${String(proyCount + 1).padStart(3, "0")}`;

  const proyecto = await prisma.proyecto.create({
    data: {
      numeroProyecto,
      tratoId: trato.id,
      cotizacionId: cot.id,
      clienteId: cliente.id,
      encargadoId: primerUsuario.id,
      nombre: "Convención Anual Grupo Arenas 2025",
      estado: "PLANEACION",
      tipoEvento: "CORPORATIVO",
      tipoServicio: "PRODUCCION_TECNICA",
      recoleccionStatus: "NO_APLICA",
      fechaEvento: new Date("2025-06-14"),
      lugarEvento: "Centro de Convenciones Querétaro — Salón Imperial",
      descripcionGeneral: "Convención anual corporativa para 350 asistentes. Incluye ponencia magistral del CEO, presentaciones de área, reconocimientos y premiación interna. Montaje desde 06:00 AM. Personal visible con ropa formal negra.",
      horaInicioEvento: "10:00",
      horaFinEvento: "19:00",
      horaInicioMontaje: "06:00",
      duracionMontajeHrs: 4,
      encargadoLugar: "Ing. Roberto Salinas",
      encargadoLugarContacto: "524421334455",
      detallesEspecificos: "Categorías: Audio profesional, Iluminación arquitectónica, Video y pantallas LED, Coordinación técnica\nReferencias: Estilo TED con pantalla LED detrás del escenario, iluminación ambiental cálida, zona de networking con música ambiente\nLímite montaje: 09:30 | Salida desmontaje: 20:00\nVenue: Salón Imperial, CCQ | Dir: Av. Constituyentes 1 Sur, Centro Histórico, Querétaro | Dimensiones: 40m × 25m × 6m alt | Eléctrico: Trifásico, 220V, 200A | Límite dB: 95 dB | Acceso: 6:00 AM | Restricciones: No anclar al techo | Acceso vehicular: Rampa norte, altura máx 3.5m\nNotas: Almacén disponible para casos. A/C central. Seguridad todo el día.",
      personal: {
        create: [
          ...(rolProduccion  ? [{ rolTecnicoId: rolProduccion,  nivel: "AA",  jornada: "LARGA", tarifaAcordada: 5000, confirmado: true  }] : []),
          ...(rolCoord       ? [{ rolTecnicoId: rolCoord,       nivel: "AA",  jornada: "LARGA", tarifaAcordada: 3000, confirmado: true  }] : []),
          ...(rolSupervision ? [{ rolTecnicoId: rolSupervision, nivel: "AA",  jornada: "LARGA", tarifaAcordada: 1500, confirmado: true  }] : []),
          ...(rolAudio       ? [{ rolTecnicoId: rolAudio,       nivel: "AAA", jornada: "LARGA", tarifaAcordada: 3200, confirmado: true  }] : []),
          ...(rolIlum        ? [{ rolTecnicoId: rolIlum,        nivel: "AA",  jornada: "LARGA", tarifaAcordada: 2600, confirmado: false }] : []),
          ...(rolVideo       ? [{ rolTecnicoId: rolVideo,       nivel: "AA",  jornada: "LARGA", tarifaAcordada: 2600, confirmado: false }] : []),
          ...(rolStage ? [
            { rolTecnicoId: rolStage, nivel: "AA", jornada: "LARGA", tarifaAcordada: 1500, confirmado: false },
            { rolTecnicoId: rolStage, nivel: "AA", jornada: "LARGA", tarifaAcordada: 1500, confirmado: false },
            { rolTecnicoId: rolStage, nivel: "AA", jornada: "LARGA", tarifaAcordada: 1500, confirmado: false },
            { rolTecnicoId: rolStage, nivel: "AA", jornada: "LARGA", tarifaAcordada: 1500, confirmado: false },
          ] : []),
        ],
      },
      checklist: {
        create: [
          { item: "Confirmar personal asignado",                                                                   orden: 0,  completado: true  },
          { item: "Confirmar equipos propios",                                                                     orden: 1,  completado: true  },
          { item: "Confirmar equipos externos / proveedores",                                                      orden: 2,  completado: false },
          { item: "Confirmar transporte",                                                                          orden: 3,  completado: false },
          { item: "Confirmar alimentación / catering",                                                             orden: 4,  completado: false },
          { item: "Confirmar hospedaje (si aplica)",                                                               orden: 5,  completado: true  },
          { item: "Confirmar horarios del evento y montaje",                                                       orden: 6,  completado: true  },
          { item: "Confirmar documentos técnicos (rider, input list, plot)",                                       orden: 7,  completado: false },
          { item: "Confirmar contactos clave del cliente y del lugar",                                             orden: 8,  completado: true  },
          { item: "Solicitar a administración presupuesto operativo (gasolinas, emergencia y gastos necesarios)",  orden: 9,  completado: false },
          { item: "Solicitar y coordinar catering de producción de acuerdo al número de personal",                orden: 10, completado: false },
          { item: "Cierre financiero preliminar confirmado",                                                       orden: 11, completado: false },
        ],
      },
      bitacora: {
        create: [
          { usuarioId: primerUsuario.id, tipo: "ACCION", contenido: `Proyecto creado automáticamente desde cotización ${numeroCotizacion}.`,                                                                                                                  createdAt: new Date("2025-04-18T10:00:00Z") },
          { usuarioId: primerUsuario.id, tipo: "NOTA",   contenido: "Daniela confirmó que el CEO tiene material propio (HDMI). Solicitar adaptadores USB-C. Audio: ponencia principal requiere solapa + backup. Verificar lista de premiados con RRHH.",   createdAt: new Date("2025-04-19T09:30:00Z") },
          { usuarioId: primerUsuario.id, tipo: "ACCION", contenido: "PM, Coordinador y Supervisor confirmados. Pendiente: operadores de iluminación y video. Buscando candidatos AA en red.",                                                                createdAt: new Date("2025-04-19T11:00:00Z") },
        ],
      },
    },
  });

  // ── 5. CxC ────────────────────────────────────────────────────────────────
  await prisma.cuentaCobrar.createMany({
    data: [
      { clienteId: cliente.id, proyectoId: proyecto.id, cotizacionId: cot.id, concepto: `Anticipo 50% — Convención Anual Grupo Arenas 2025`,    tipoPago: "ANTICIPO",    monto: 46777, fechaCompromiso: new Date("2025-05-15"), estado: "PAGADA",   notas: "Transferencia recibida el 15 de mayo. Ref: TRF-20250515-GA" },
      { clienteId: cliente.id, proyectoId: proyecto.id, cotizacionId: cot.id, concepto: `Liquidación 50% — Convención Anual Grupo Arenas 2025`, tipoPago: "LIQUIDACION", monto: 46777, fechaCompromiso: new Date("2025-06-13"), estado: "PENDIENTE", notas: "Pago esperado 1 día antes del evento." },
    ],
  });

  // ── 6. CxP ────────────────────────────────────────────────────────────────
  await prisma.cuentaPagar.create({
    data: {
      tipoAcreedor: "OTRO",
      proyectoId: proyecto.id,
      concepto: "Flete redondo CDMX–Querétaro — Camión 3.5T",
      monto: 2200,
      fechaCompromiso: new Date("2025-06-15"),
      estado: "PENDIENTE",
      notas: "Pagar al chofer el día del evento contra factura.",
    },
  });

  return NextResponse.json({
    ok: true,
    ids: { clienteId: cliente.id, tratoId: trato.id, cotizacionId: cot.id, proyectoId: proyecto.id },
    numeros: { numeroCotizacion, numeroProyecto },
    mensaje: "✅ Datos piloto creados. Llama DELETE para limpiar cuando termines.",
  });
}

// DELETE: elimina todos los datos piloto de Daniela Reyes / Grupo Arenas
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  const secret = req.headers.get("x-seed-secret");
  if (!session && secret !== "mainstage-piloto-2025") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cliente = await prisma.cliente.findFirst({ where: { correo: "daniela.reyes@grupoarenas.mx" } });
  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const tratos = await prisma.trato.findMany({ where: { clienteId: cliente.id }, select: { id: true } });
  const tratoIds = tratos.map(t => t.id);
  const cots = await prisma.cotizacion.findMany({ where: { clienteId: cliente.id }, select: { id: true } });
  const cotIds = cots.map(c => c.id);
  const proyectos = await prisma.proyecto.findMany({ where: { clienteId: cliente.id }, select: { id: true } });
  const proyIds = proyectos.map(p => p.id);

  await prisma.$transaction(async (tx) => {
    if (proyIds.length) {
      await tx.cuentaCobrar.updateMany({ where: { proyectoId: { in: proyIds } }, data: { movimientoId: null } });
      await tx.cuentaPagar.updateMany({  where: { proyectoId: { in: proyIds } }, data: { movimientoId: null } });
      await tx.movimientoFinanciero.deleteMany({ where: { proyectoId: { in: proyIds } } });
      await tx.cuentaCobrar.deleteMany({   where: { proyectoId: { in: proyIds } } });
      await tx.cuentaPagar.deleteMany({    where: { proyectoId: { in: proyIds } } });
      await tx.proyectoPersonal.deleteMany({ where: { proyectoId: { in: proyIds } } });
      await tx.proyectoEquipo.deleteMany({   where: { proyectoId: { in: proyIds } } });
      await tx.proyectoChecklist.deleteMany({ where: { proyectoId: { in: proyIds } } });
      await tx.proyectoBitacora.deleteMany({ where: { proyectoId: { in: proyIds } } });
      await tx.proyecto.deleteMany({ where: { id: { in: proyIds } } });
    }
    if (cotIds.length) await tx.cotizacionLinea.deleteMany({ where: { cotizacionId: { in: cotIds } } });
    if (cotIds.length) await tx.cotizacion.deleteMany({ where: { id: { in: cotIds } } });
    if (tratoIds.length) await tx.trato.deleteMany({ where: { id: { in: tratoIds } } });
    await tx.cliente.delete({ where: { id: cliente.id } });
  });

  return NextResponse.json({ ok: true, mensaje: "🗑 Datos piloto eliminados." });
}
