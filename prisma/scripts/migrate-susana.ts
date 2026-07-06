/**
 * Script de migración: PagoNomina de Susana → RepartoUtilidad
 * Ejecutar: npx tsx prisma/scripts/migrate-susana.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Buscando PersonalInterno con nombre 'Susana'...");

  const susana = await prisma.personalInterno.findFirst({
    where: { nombre: { contains: "Susana", mode: "insensitive" } },
    include: {
      pagos: {
        include: { movimiento: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!susana) {
    console.log("❌ No se encontró PersonalInterno con nombre 'Susana'. Nada que migrar.");
    return;
  }

  console.log(`✅ Encontrado: ${susana.nombre} (id: ${susana.id})`);
  console.log(`   Puesto: ${susana.puesto} | Activo: ${susana.activo}`);
  console.log(`   Total PagoNomina: ${susana.pagos.length}`);

  const pagosAMigrar = susana.pagos.filter((p) => p.monto >= 3500);
  console.log(`   A migrar (monto ≥ $3,500): ${pagosAMigrar.length}`);

  if (pagosAMigrar.length === 0) {
    console.log("ℹ️  No hay pagos de nómina para migrar.");

    // ── Verificar si ya existen cuotas de reparto ────────────────────────────
    const repartoExistente = await prisma.repartoUtilidad.findFirst({
      where: { beneficiario: { contains: "Susana", mode: "insensitive" } },
      include: { cuotas: true },
    });
    if (repartoExistente) {
      console.log(`ℹ️  Reparto existente: "${repartoExistente.nombre}" con ${repartoExistente.cuotas.length} cuotas.`);
    }
    return;
  }

  console.log("\n📋 Detalle de pagos a migrar:");
  for (const p of pagosAMigrar) {
    console.log(`   - ${p.periodo ?? "sin período"} | $${p.monto} | ${p.estado} | movimiento: ${p.movimientoId ?? "ninguno"}`);
  }

  // ── Obtener o crear RepartoUtilidad ─────────────────────────────────────────
  let reparto = await prisma.repartoUtilidad.findFirst({
    where: { beneficiario: { contains: "Susana", mode: "insensitive" } },
  });

  if (!reparto) {
    console.log("\n🆕 Creando RepartoUtilidad para Susana...");
    const socio = await prisma.socio.findFirst({
      where: { nombre: { contains: "Susana", mode: "insensitive" } },
    });

    reparto = await prisma.repartoUtilidad.create({
      data: {
        nombre: "Reparto semanal Susana Vázquez Mellado",
        beneficiario: "Susana Vázquez Mellado",
        descripcion: "Reparto de utilidades semanal fijo — socia",
        montoBase: 4000,
        tipoPeriodo: "SEMANAL",
        baseCalculo: "FIJO",
        socioId: socio?.id ?? null,
        notas: "Creado por migración desde nómina (migrate-susana.ts)",
      },
    });
    console.log(`✅ RepartoUtilidad creado: id=${reparto.id}`);
  } else {
    console.log(`\n✅ Usando RepartoUtilidad existente: "${reparto.nombre}" (id: ${reparto.id})`);
  }

  // ── Migrar cada PagoNomina ───────────────────────────────────────────────────
  console.log("\n🔄 Migrando pagos...");
  let migrados = 0;
  let omitidos = 0;
  let errores = 0;

  for (const pago of pagosAMigrar) {
    const periodoNorm = pago.periodo ?? `migrado-${pago.id.slice(0, 8)}`;

    // Verificar duplicado
    const existe = await prisma.cuotaReparto.findFirst({
      where: { repartoId: reparto.id, periodo: periodoNorm },
    });
    if (existe) {
      console.log(`   ⚠️  Ya existe CuotaReparto para período ${periodoNorm}, omitiendo.`);
      omitidos++;
      continue;
    }

    try {
      // 1. Actualizar MovimientoFinanciero: GASTO → RETIRO
      if (pago.movimientoId) {
        await prisma.movimientoFinanciero.update({
          where: { id: pago.movimientoId },
          data: {
            tipo: "RETIRO",
            concepto: `Reparto de utilidades — Susana Vázquez Mellado (${periodoNorm})`,
            notas: `Reclasificado de nómina a reparto el ${new Date().toLocaleDateString("es-MX")}`,
          },
        });
      }

      // 2. Crear CuentaPagar con esReparto:true
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
          notas: `Migrado desde PagoNomina id: ${pago.id}`,
        },
      });

      // 3. Crear CuotaReparto
      const cuota = await prisma.cuotaReparto.create({
        data: {
          repartoId: reparto.id,
          periodo: periodoNorm,
          monto: pago.monto,
          estado: pago.estado === "PAGADO" ? "PAGADO" : "PENDIENTE",
          cuentaPagarId: cxp.id,
        },
      });

      // 4. Desvincular MovimientoFinanciero del PagoNomina antes de borrar
      await prisma.pagoNomina.update({
        where: { id: pago.id },
        data: { movimientoId: null },
      });

      // 5. Eliminar PagoNomina
      await prisma.pagoNomina.delete({ where: { id: pago.id } });

      console.log(`   ✅ ${periodoNorm} | $${pago.monto} → cuota:${cuota.id.slice(0, 8)} cxp:${cxp.id.slice(0, 8)}`);
      migrados++;
    } catch (err) {
      console.error(`   ❌ Error migrando ${periodoNorm}:`, err);
      errores++;
    }
  }

  // ── Actualizar Socio si existe ────────────────────────────────────────────────
  const socio = await prisma.socio.findFirst({
    where: { nombre: { contains: "Susana", mode: "insensitive" } },
  });
  if (socio) {
    await prisma.socio.update({
      where: { id: socio.id },
      data: { esRepartoUtilidades: true, montoRepartoSemanal: 4000 },
    });
    console.log(`\n✅ Socio actualizado: ${socio.nombre} → esRepartoUtilidades=true, montoRepartoSemanal=4000`);
  } else {
    console.log(`\nℹ️  No se encontró Socio vinculado a Susana (no es error si no está registrada como socia).`);
  }

  console.log(`\n🎉 Migración completada: ${migrados} migrados, ${omitidos} omitidos, ${errores} errores`);
}

main()
  .catch((e) => { console.error("💥 Error fatal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
