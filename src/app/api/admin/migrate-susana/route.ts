import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET  /api/admin/migrate-susana  → dry-run: muestra qué se migraría
 * POST /api/admin/migrate-susana  → ejecuta la migración
 *
 * Reclasifica todos los PagoNomina de Susana Vázquez Mellado (monto=$4,000)
 * como CuotaReparto + CuentaPagar(esReparto:true).
 * Los MovimientoFinanciero asociados se actualizan de tipo GASTO → RETIRO.
 * Los PagoNomina originales se eliminan.
 */

async function getSusana() {
  return prisma.personalInterno.findFirst({
    where: { nombre: { contains: "Susana", mode: "insensitive" } },
    include: {
      pagos: {
        include: { movimiento: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

async function getOrCreateReparto() {
  const existing = await prisma.repartoUtilidad.findFirst({
    where: { beneficiario: { contains: "Susana", mode: "insensitive" } },
  });
  if (existing) return existing;

  // Buscar socio Susana
  const socio = await prisma.socio.findFirst({
    where: { nombre: { contains: "Susana", mode: "insensitive" } },
  });

  return prisma.repartoUtilidad.create({
    data: {
      nombre: "Reparto semanal Susana Vázquez Mellado",
      beneficiario: "Susana Vázquez Mellado",
      descripcion: "Reparto de utilidades semanal fijo — socia fundadora",
      montoBase: 4000,
      tipoPeriodo: "SEMANAL",
      baseCalculo: "FIJO",
      socioId: socio?.id ?? null,
      notas: "Creado automáticamente durante migración de nómina → reparto",
    },
  });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const susana = await getSusana();

  if (!susana) {
    return NextResponse.json({
      encontrado: false,
      mensaje: "No se encontró ningún PersonalInterno con nombre 'Susana'",
    });
  }

  const pagosPendientes = susana.pagos.filter((p) => p.monto === 4000 || p.monto > 3500);
  const repartoExistente = await prisma.repartoUtilidad.findFirst({
    where: { beneficiario: { contains: "Susana", mode: "insensitive" } },
    include: { cuotas: true },
  });

  return NextResponse.json({
    encontrado: true,
    susana: {
      id: susana.id,
      nombre: susana.nombre,
      puesto: susana.puesto,
      activo: susana.activo,
    },
    pagosNomina: {
      total: susana.pagos.length,
      aMigrar: pagosPendientes.length,
      detalle: pagosPendientes.map((p) => ({
        id: p.id,
        periodo: p.periodo,
        monto: p.monto,
        estado: p.estado,
        concepto: p.concepto,
        fechaPago: p.fechaPago,
        tieneMovimiento: !!p.movimiento,
        movimientoTipo: p.movimiento?.tipo ?? null,
      })),
    },
    repartoExistente: repartoExistente
      ? {
          id: repartoExistente.id,
          nombre: repartoExistente.nombre,
          cuotasExistentes: repartoExistente.cuotas.length,
        }
      : null,
    instrucciones: "Envía POST a este endpoint para ejecutar la migración. No se puede deshacer.",
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const confirmar = body.confirmar === true;

  if (!confirmar) {
    return NextResponse.json({
      error: "Debes enviar { confirmar: true } en el body para ejecutar la migración",
    }, { status: 400 });
  }

  const susana = await getSusana();
  if (!susana) {
    return NextResponse.json({ error: "No se encontró PersonalInterno con nombre 'Susana'" }, { status: 404 });
  }

  const reparto = await getOrCreateReparto();
  const resultados: {
    pagoId: string;
    periodo: string;
    monto: number;
    accion: "migrado" | "ya_existe" | "error";
    cuotaId?: string;
    cxpId?: string;
    mensaje?: string;
  }[] = [];

  const pagosAMigrar = susana.pagos.filter((p) => p.monto >= 3500);

  for (const pago of pagosAMigrar) {
    try {
      // Verificar si ya existe una CuotaReparto para este período
      const periodoNorm = pago.periodo ?? `migrado-${pago.id}`;
      const existente = await prisma.cuotaReparto.findFirst({
        where: { repartoId: reparto.id, periodo: periodoNorm },
      });

      if (existente) {
        resultados.push({ pagoId: pago.id, periodo: periodoNorm, monto: pago.monto, accion: "ya_existe", cuotaId: existente.id });
        continue;
      }

      // Actualizar el MovimientoFinanciero asociado: GASTO → RETIRO
      if (pago.movimientoId && pago.movimiento) {
        await prisma.movimientoFinanciero.update({
          where: { id: pago.movimientoId },
          data: {
            tipo: "RETIRO",
            concepto: `Reparto de utilidades — Susana Vázquez Mellado (${periodoNorm})`,
            notas: `Reclasificado desde nómina a reparto de utilidades. Movimiento original: GASTO`,
          },
        });
      }

      // Crear CuentaPagar con esReparto:true (si el pago está PENDIENTE o no tiene movimiento)
      const fechaCompromiso = pago.fechaPago ?? new Date();
      const cxp = await prisma.cuentaPagar.create({
        data: {
          tipoAcreedor: "SOCIO",
          socioId: reparto.socioId ?? null,
          concepto: `Reparto de utilidades ${periodoNorm} — Susana Vázquez Mellado`,
          monto: pago.monto,
          montoPagado: pago.estado === "PAGADO" ? pago.monto : 0,
          fechaCompromiso,
          fechaPagoReal: pago.estado === "PAGADO" ? fechaCompromiso : null,
          estado: pago.estado === "PAGADO" ? "LIQUIDADO" : "PENDIENTE",
          esReparto: true,
          movimientoId: pago.movimientoId ?? null,
          notas: `Migrado desde PagoNomina (id: ${pago.id})`,
        },
      });

      // Crear CuotaReparto vinculada
      const cuota = await prisma.cuotaReparto.create({
        data: {
          repartoId: reparto.id,
          periodo: periodoNorm,
          monto: pago.monto,
          estado: pago.estado === "PAGADO" ? "PAGADO" : "PENDIENTE",
          cuentaPagarId: cxp.id,
        },
      });

      // Eliminar PagoNomina original (desvinculando movimiento primero)
      await prisma.pagoNomina.update({
        where: { id: pago.id },
        data: { movimientoId: null },
      });
      await prisma.pagoNomina.delete({ where: { id: pago.id } });

      resultados.push({ pagoId: pago.id, periodo: periodoNorm, monto: pago.monto, accion: "migrado", cuotaId: cuota.id, cxpId: cxp.id });
    } catch (err) {
      resultados.push({ pagoId: pago.id, periodo: pago.periodo, monto: pago.monto, accion: "error", mensaje: String(err) });
    }
  }

  // Actualizar el PersonalInterno para marcarla como fuera de nómina
  // (si existe campo de referencia en schema)
  // También buscar si hay un Socio vinculado y actualizar esRepartoUtilidades
  const socio = await prisma.socio.findFirst({
    where: { nombre: { contains: "Susana", mode: "insensitive" } },
  });
  if (socio) {
    await prisma.socio.update({
      where: { id: socio.id },
      data: {
        esRepartoUtilidades: true,
        montoRepartoSemanal: 4000,
      },
    });
  }

  const migrados = resultados.filter((r) => r.accion === "migrado").length;
  const errores = resultados.filter((r) => r.accion === "error").length;

  return NextResponse.json({
    ok: true,
    reparto: { id: reparto.id, nombre: reparto.nombre },
    susana: { id: susana.id, nombre: susana.nombre },
    socioActualizado: !!socio,
    resumen: {
      total: pagosAMigrar.length,
      migrados,
      yaExistian: resultados.filter((r) => r.accion === "ya_existe").length,
      errores,
    },
    resultados,
    mensaje: errores === 0
      ? `✅ Migración completa. ${migrados} pago(s) reclasificados como reparto de utilidades.`
      : `⚠️ Migración con errores. ${migrados} migrados, ${errores} fallidos.`,
  });
}
