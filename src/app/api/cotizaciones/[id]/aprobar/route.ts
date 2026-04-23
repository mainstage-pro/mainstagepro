import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function proximoLunesTraEvento(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const dow = d.getDay();
  d.setDate(d.getDate() + (8 - dow) % 7);
  return d;
}

function proximoMiercolesTraEvento(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
  return d;
}

// Checklist operativo base para producción técnica / dirección técnica
const CHECKLIST_BASE = [
  "Confirmar personal asignado",
  "Confirmar equipos propios",
  "Confirmar equipos externos / proveedores",
  "Confirmar transporte",
  "Confirmar alimentación / catering",
  "Confirmar hospedaje (si aplica)",
  "Confirmar horarios del evento y montaje",
  "Confirmar documentos técnicos (rider, input list, plot)",
  "Confirmar contactos clave del cliente y del lugar",
  "Solicitar a administración presupuesto operativo (gasolinas, emergencia y gastos necesarios)",
  "Solicitar y coordinar catering de producción de acuerdo al número de personal",
  "Cierre financiero preliminar confirmado",
];

// Checklist operativo base para renta de equipo
const CHECKLIST_RENTA = [
  "Confirmar lista de equipos a entregar",
  "Verificar inventario y estado del equipo antes de salida",
  "Preparar y revisar hoja de entrega (firmas y cantidades)",
  "Confirmar dirección y horario de entrega",
  "Confirmar fecha y horario de devolución/recolección",
  "Confirmar si el cliente tiene técnico propio (y su contacto)",
  "Confirmar anticipo y condiciones de pago",
  "Confirmar contacto del cliente para el día de entrega",
  "Empacar y etiquetar equipo por bulto",
  "Registrar fotos del equipo al momento de entrega",
  "Obtener firma de responsiva al entregar",
  "Verificar regreso del equipo en buen estado",
  "Cierre financiero confirmado",
];

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Cargar cotización completa
  const cot = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      trato: true,
      cliente: true,
      lineas: true,
      proyecto: { select: { id: true } },
    },
  });

  if (!cot) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
  if (cot.proyecto) {
    // Ya existe el proyecto, redirigir sin crear otro
    return NextResponse.json({ proyectoId: cot.proyecto.id, yaExistia: true });
  }

  // Generar número de proyecto: PRY-YYYY-NNN
  const year = new Date().getFullYear();
  const count = await prisma.proyecto.count({
    where: { numeroProyecto: { startsWith: `PRY-${year}-` } },
  });
  const numeroProyecto = `PRY-${year}-${String(count + 1).padStart(3, "0")}`;

  // Fechas para CxC
  const hoy = new Date();
  const fechaEvento = cot.fechaEvento ?? new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);

  // ── Leer plan de pagos (o usar default 50/50) ──────────────────────────────
  // Convención diasAntes:
  //   > 0  → días ANTES del evento  (ej: 3 = 3 días antes)
  //   = 0  → día del evento
  //   < 0  → días DESPUÉS del evento (ej: -1 = 1 día después = día siguiente)
  type PagoPlan = { concepto: string; porcentaje: number; monto?: number; diasAntes: number; tipoPago: string };
  let cuotas: PagoPlan[];
  try {
    const plan = cot.planPagos ? JSON.parse(cot.planPagos) : null;
    cuotas = (plan?.pagos && plan.pagos.length > 0)
      ? plan.pagos
      : [
          { concepto: `Anticipo 50% — `, porcentaje: 50, diasAntes: 30, tipoPago: "ANTICIPO" },
          { concepto: `Liquidación 50% — `, porcentaje: 50, diasAntes: -1, tipoPago: "LIQUIDACION" },
        ];
  } catch {
    cuotas = [
      { concepto: `Anticipo 50% — `, porcentaje: 50, diasAntes: 30, tipoPago: "ANTICIPO" },
      { concepto: `Liquidación 50% — `, porcentaje: 50, diasAntes: -1, tipoPago: "LIQUIDACION" },
    ];
  }

  function fechaPago(diasAntes: number): Date {
    // Post-event or same-day → next Monday; pre-event → plan-based date
    if (diasAntes <= 0) return proximoLunesTraEvento(fechaEvento);
    return new Date(fechaEvento.getTime() - diasAntes * 24 * 60 * 60 * 1000);
  }

  // Equipos propios y externos de la cotización para copiar al proyecto
  const lineasEquipo = cot.lineas.filter(
    (l) => ["EQUIPO_PROPIO", "EQUIPO_EXTERNO"].includes(l.tipo) && l.equipoId
  );

  // Líneas de personal (OPERACION_TECNICA) para expandir por cantidad
  const lineasPersonal = cot.lineas.filter(
    (l) => l.tipo === "OPERACION_TECNICA" && l.rolTecnicoId
  );

  // Ejecutar todo en una transacción
  let proyecto;
  try {
  proyecto = await prisma.$transaction(async (tx) => {
    // 1. Crear el proyecto
    const proy = await tx.proyecto.create({
      data: {
        numeroProyecto,
        tratoId: cot.tratoId,
        cotizacionId: cot.id,
        clienteId: cot.clienteId,
        encargadoId: cot.creadaPorId,
        nombre: cot.nombreEvento || `Proyecto ${cot.numeroCotizacion}`,
        estado: "PLANEACION",
        tipoEvento: cot.tipoEvento || cot.trato.tipoEvento || "OTRO",
        tipoServicio: cot.tipoServicio || cot.trato.tipoServicio,
        recoleccionStatus: (cot.tipoServicio || cot.trato.tipoServicio) === "RENTA" ? "PENDIENTE" : "NO_APLICA",
        fechaEvento,
        lugarEvento: cot.lugarEvento,
        descripcionGeneral: cot.observaciones,
        horaInicioEvento: cot.trato.horaInicioEvento ?? null,
        horaFinEvento: cot.trato.horaFinEvento ?? null,
        horaInicioMontaje: cot.trato.ventanaMontajeInicio ?? null,
        duracionMontajeHrs: cot.trato.duracionMontajeHrs ?? null,
        encargadoLugar: cot.trato.contactoVenueNombre ?? null,
        encargadoLugarContacto: cot.trato.contactoVenueTelefono ?? null,
        detallesEspecificos: (() => {
          const partes: string[] = [];
          if (cot.trato.notas) partes.push(cot.trato.notas);
          const tipoSrv = cot.tipoServicio || cot.trato.tipoServicio;
          if (tipoSrv !== "RENTA") {
            // Categorías de equipo seleccionadas
            try {
              const cats = cot.trato.serviciosInteres ? JSON.parse(cot.trato.serviciosInteres) : [];
              if (cats.length > 0) partes.push(`Categorías: ${cats.join(", ")}`);
            } catch { /* ignore */ }
            // Referencias / ideas
            if (cot.trato.ideasReferencias) partes.push(`Referencias: ${cot.trato.ideasReferencias}`);
            // Ventana de desmontaje
            if (cot.trato.ventanaMontajeFin) partes.push(`Límite montaje: ${cot.trato.ventanaMontajeFin}`);
            if (cot.trato.horaTerminoMontaje) partes.push(`Salida desmontaje: ${cot.trato.horaTerminoMontaje}`);
            // Venue scouting
            try {
              const s = cot.trato.scoutingData ? JSON.parse(cot.trato.scoutingData) : {};
              const venue: string[] = [];
              if (s.nombreVenue) venue.push(`Venue: ${s.nombreVenue}`);
              if (s.direccion) venue.push(`Dir: ${s.direccion}`);
              if (s.largo && s.ancho) venue.push(`Dimensiones: ${s.largo}m × ${s.ancho}m${s.alturaMaxima ? ` × ${s.alturaMaxima}m alt` : ""}`);
              if (s.voltajeDisponible || s.amperajeTotalDisponible) venue.push(`Eléctrico: ${[s.fases, s.voltajeDisponible && `${s.voltajeDisponible}V`, s.amperajeTotalDisponible && `${s.amperajeTotalDisponible}A`].filter(Boolean).join(", ")}`);
              if (s.restriccionDecibeles) venue.push(`Límite dB: ${s.restriccionDecibeles}`);
              if (s.restriccionHorarioAcceso) venue.push(`Horario acceso: ${s.restriccionHorarioAcceso}`);
              if (s.restriccionInstalacion) venue.push(`Restricciones: ${s.restriccionInstalacion}`);
              if (s.accesoVehicular) venue.push(`Acceso vehicular: ${s.accesoVehicular}`);
              if (s.notasScouting) venue.push(`Notas venue: ${s.notasScouting}`);
              if (venue.length > 0) partes.push(venue.join(" | "));
            } catch { /* ignore */ }
          }
          return partes.length > 0 ? partes.join("\n") : null;
        })(),
        logisticaRenta: (() => {
          if ((cot.tipoServicio || cot.trato.tipoServicio) !== "RENTA") return null;
          try {
            const s = cot.trato.scoutingData ? JSON.parse(cot.trato.scoutingData) : {};
            if (!s.rentaPiso && !s.rentaHorarioEntrega && !s.rentaHorarioRecoleccion) return null;
            return JSON.stringify({
              piso: s.rentaPiso || null,
              hayElevador: s.rentaHayElevador || null,
              horarioEntrega: s.rentaHorarioEntrega || null,
              horarioRecoleccion: s.rentaHorarioRecoleccion || null,
              zonaCarga: s.rentaZonaCarga || null,
              accesoVehicular: s.rentaAccesoVehicular || null,
              notas: s.rentaNotasEntrega || null,
            });
          } catch { return null; }
        })(),
      },
    });

    // 2. Copiar equipos al proyecto (incluyendo proveedorId para externos)
    if (lineasEquipo.length > 0) {
      await tx.proyectoEquipo.createMany({
        data: lineasEquipo.map((l) => ({
          proyectoId: proy.id,
          equipoId: l.equipoId!,
          tipo: l.tipo === "EQUIPO_EXTERNO" ? "EXTERNO" : "PROPIO",
          cantidad: Math.round(l.cantidad),
          dias: l.dias,
          costoExterno: l.tipo === "EQUIPO_EXTERNO" ? l.costoUnitario : null,
          proveedorId: l.tipo === "EQUIPO_EXTERNO" ? (l.proveedorId ?? null) : null,
        })),
      });
    }

    // 2b. Crear CxP para cada equipo externo con costo
    const lineasExternas = lineasEquipo.filter(
      (l) => l.tipo === "EQUIPO_EXTERNO" && (l.costoUnitario ?? 0) > 0
    );
    if (lineasExternas.length > 0) {
      const fechaCxP = proximoMiercolesTraEvento(fechaEvento);
      await tx.cuentaPagar.createMany({
        data: lineasExternas.map((l) => ({
          tipoAcreedor: l.proveedorId ? "PROVEEDOR" : "OTRO",
          proveedorId: l.proveedorId ?? null,
          proyectoId: proy.id,
          concepto: `${l.descripcion} (x${Math.round(l.cantidad)} × ${l.dias}d)${!l.proveedorId ? " — ⚠ Asignar proveedor" : ""}`,
          monto: l.costoUnitario * Math.round(l.cantidad) * l.dias,
          fechaCompromiso: fechaCxP,
          estado: "PENDIENTE",
          notas: !l.proveedorId ? "Proveedor no asignado en la cotización. Asignar manualmente en CxP." : null,
        })),
      });
    }

    // 3. Expandir personal de la cotización: cada línea con cantidad N → N filas individuales
    if (lineasPersonal.length > 0) {
      const personalData = lineasPersonal.flatMap((l) =>
        Array.from({ length: Math.max(1, Math.round(l.cantidad)) }, () => ({
          proyectoId: proy.id,
          rolTecnicoId: l.rolTecnicoId!,
          nivel: l.nivel ?? null,
          jornada: l.jornada ?? null,
          tarifaAcordada: l.precioUnitario > 0 ? l.precioUnitario : null,
          confirmado: false,
        }))
      );
      await tx.proyectoPersonal.createMany({ data: personalData });
    }

    // 4. Crear checklist base según tipo de servicio
    const tipoServicio = cot.tipoServicio || cot.trato.tipoServicio;
    const checklistItems = tipoServicio === "RENTA" ? CHECKLIST_RENTA : CHECKLIST_BASE;
    await tx.proyectoChecklist.createMany({
      data: checklistItems.map((item, i) => ({
        proyectoId: proy.id,
        item,
        orden: i,
        completado: false,
      })),
    });

    // 4b. Para renta: copiar logística del trato al proyecto
    if (tipoServicio === "RENTA" && cot.trato.ideasReferencias) {
      try {
        const rentaData = JSON.parse(cot.trato.ideasReferencias);
        if (rentaData && typeof rentaData === "object" && rentaData.nivelServicio) {
          await tx.proyecto.update({
            where: { id: proy.id },
            data: { logisticaRenta: cot.trato.ideasReferencias },
          });
        }
      } catch { /* ideasReferencias es texto plano, no JSON */ }
    }

    // 5 & 6. Crear CxC según plan de pagos
    let acumulado = 0;
    for (let i = 0; i < cuotas.length; i++) {
      const cuota = cuotas[i];
      const esUltima = i === cuotas.length - 1;
      const monto = esUltima
        ? Math.round((cot.granTotal - acumulado) * 100) / 100
        : (cuota.monto && cuota.monto > 0)
          ? cuota.monto
          : Math.round(cot.granTotal * (cuota.porcentaje / 100) * 100) / 100;
      acumulado += monto;
      const concepto = cuota.concepto.endsWith(" — ")
        ? `${cuota.concepto}${proy.nombre}`
        : cuota.concepto || `Pago ${i + 1} — ${proy.nombre}`;
      await tx.cuentaCobrar.create({
        data: {
          clienteId: cot.clienteId,
          proyectoId: proy.id,
          cotizacionId: cot.id,
          concepto,
          tipoPago: cuota.tipoPago || (i === 0 ? "ANTICIPO" : "LIQUIDACION"),
          monto,
          fechaCompromiso: fechaPago(cuota.diasAntes),
          estado: "PENDIENTE",
        },
      });
    }

    // 5b. Crear gastos operativos desde cotización (comidas, transporte, hospedaje)
    const gastosOpData: Array<{
      proyectoId: string; tipo: string; concepto: string; monto: number; cantidad: number; notas: string | null;
    }> = [];
    if ((cot.subtotalComidas ?? 0) > 0) {
      gastosOpData.push({
        proyectoId: proy.id,
        tipo: "COMIDA",
        concepto: `Alimentación producción — ${cot.diasComidas} día${cot.diasComidas !== 1 ? "s" : ""}`,
        monto: cot.subtotalComidas,
        cantidad: 1,
        notas: null,
      });
    }
    if ((cot.subtotalTransporte ?? 0) > 0) {
      gastosOpData.push({
        proyectoId: proy.id,
        tipo: "TRANSPORTE",
        concepto: `Transporte producción — ${cot.diasTransporte} día${cot.diasTransporte !== 1 ? "s" : ""}`,
        monto: cot.subtotalTransporte,
        cantidad: 1,
        notas: null,
      });
    }
    if ((cot.subtotalHospedaje ?? 0) > 0) {
      gastosOpData.push({
        proyectoId: proy.id,
        tipo: "HOSPEDAJE",
        concepto: `Hospedaje producción — ${cot.diasHospedaje} día${cot.diasHospedaje !== 1 ? "s" : ""}`,
        monto: cot.subtotalHospedaje,
        cantidad: 1,
        notas: null,
      });
    }
    if (gastosOpData.length > 0) {
      await tx.gastoOperativo.createMany({ data: gastosOpData });
    }

    // 7. Entrada en bitácora
    await tx.proyectoBitacora.create({
      data: {
        proyectoId: proy.id,
        usuarioId: session.id,
        tipo: "ACCION",
        contenido: `Proyecto creado automáticamente desde cotización ${cot.numeroCotizacion} por ${session.name ?? "sistema"}.`,
      },
    });

    // 8. Actualizar cotización → APROBADA
    await tx.cotizacion.update({
      where: { id: cot.id },
      data: { estado: "APROBADA" },
    });

    // 9. Actualizar trato → VENTA_CERRADA
    await tx.trato.update({
      where: { id: cot.tratoId },
      data: { etapa: "VENTA_CERRADA" },
    });

    return proy;
  });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[aprobar]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ proyectoId: proyecto!.id, numeroProyecto: proyecto!.numeroProyecto });
}
