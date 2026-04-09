import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function miercolesLimitePago(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  let dias = (3 - d.getDay() + 7) % 7;
  if (dias < 3) dias += 7;
  d.setDate(d.getDate() + dias);
  return d;
}

// Checklist operativo base que se genera automáticamente al crear un proyecto
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
  const fechaAnticipo = new Date(hoy.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 días
  const fechaEvento = cot.fechaEvento ?? new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fechaLiquidacion = new Date(fechaEvento.getTime() - 24 * 60 * 60 * 1000); // día antes del evento

  const anticipo = Math.round(cot.granTotal * 0.5 * 100) / 100;
  const liquidacion = cot.granTotal - anticipo;

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
        fechaEvento,
        lugarEvento: cot.lugarEvento,
        descripcionGeneral: cot.observaciones,
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
      const fechaCxP = miercolesLimitePago(fechaEvento);
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
          confirmado: false,
        }))
      );
      await tx.proyectoPersonal.createMany({ data: personalData });
    }

    // 4. Crear checklist base
    await tx.proyectoChecklist.createMany({
      data: CHECKLIST_BASE.map((item, i) => ({
        proyectoId: proy.id,
        item,
        orden: i,
        completado: false,
      })),
    });

    // 5. Crear CxC: anticipo
    await tx.cuentaCobrar.create({
      data: {
        clienteId: cot.clienteId,
        proyectoId: proy.id,
        cotizacionId: cot.id,
        concepto: `Anticipo 50% — ${proy.nombre}`,
        tipoPago: "ANTICIPO",
        monto: anticipo,
        fechaCompromiso: fechaAnticipo,
        estado: "PENDIENTE",
      },
    });

    // 6. Crear CxC: liquidación
    await tx.cuentaCobrar.create({
      data: {
        clienteId: cot.clienteId,
        proyectoId: proy.id,
        cotizacionId: cot.id,
        concepto: `Liquidación 50% — ${proy.nombre}`,
        tipoPago: "LIQUIDACION",
        monto: liquidacion,
        fechaCompromiso: fechaLiquidacion,
        estado: "PENDIENTE",
      },
    });

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
