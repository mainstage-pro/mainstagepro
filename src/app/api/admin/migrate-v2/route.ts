import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/admin/migrate-v2
 * Aplica las migraciones de schema v2 (Fase 1 rutas de servicio):
 * - ProyectoChecklist.tipo
 * - ProyectoPersonal.confirmToken, confirmRespuesta
 * - ProyectoEquipo.confirmToken, confirmDisponible
 * - Proyecto.logisticaRenta
 *
 * Solo accesible por ADMIN.
 */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultados: string[] = [];

  const run = async (sql: string, desc: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      resultados.push(`✓ ${desc}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Ignorar errores de columna ya existente
      if (msg.includes("already exists") || msg.includes("duplicate column")) {
        resultados.push(`⚠ Ya existe: ${desc}`);
      } else {
        resultados.push(`✗ Error en ${desc}: ${msg}`);
      }
    }
  };

  // ProyectoChecklist.tipo
  await run(
    `ALTER TABLE proyecto_checklist ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'OPERACION'`,
    "proyecto_checklist.tipo"
  );

  // ProyectoPersonal.confirmToken
  await run(
    `ALTER TABLE proyecto_personal ADD COLUMN IF NOT EXISTS "confirmToken" TEXT`,
    "proyecto_personal.confirmToken"
  );
  await run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_confirm_token ON proyecto_personal("confirmToken") WHERE "confirmToken" IS NOT NULL`,
    "index proyecto_personal.confirmToken"
  );

  // ProyectoPersonal.confirmRespuesta
  await run(
    `ALTER TABLE proyecto_personal ADD COLUMN IF NOT EXISTS "confirmRespuesta" TEXT`,
    "proyecto_personal.confirmRespuesta"
  );

  // ProyectoEquipo.confirmToken
  await run(
    `ALTER TABLE proyecto_equipos ADD COLUMN IF NOT EXISTS "confirmToken" TEXT`,
    "proyecto_equipos.confirmToken"
  );
  await run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_equipo_confirm_token ON proyecto_equipos("confirmToken") WHERE "confirmToken" IS NOT NULL`,
    "index proyecto_equipos.confirmToken"
  );

  // ProyectoEquipo.confirmDisponible
  await run(
    `ALTER TABLE proyecto_equipos ADD COLUMN IF NOT EXISTS "confirmDisponible" BOOLEAN`,
    "proyecto_equipos.confirmDisponible"
  );

  // Proyecto.logisticaRenta
  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "logisticaRenta" TEXT`,
    "proyectos.logisticaRenta"
  );

  // Proyecto.reporteCatering
  await run(
    `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "reporteCatering" TEXT`,
    "proyectos.reporteCatering"
  );

  // Trato.tipoProspecto
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "tipoProspecto" TEXT NOT NULL DEFAULT 'ACTIVO'`,
    "tratos.tipoProspecto"
  );

  // Trato.nurturingData
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "nurturingData" TEXT`,
    "tratos.nurturingData"
  );

  // Trato.horaInicioEvento / horaFinEvento / duracionMontajeHrs
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "horaInicioEvento" TEXT`,
    "tratos.horaInicioEvento"
  );
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "horaFinEvento" TEXT`,
    "tratos.horaFinEvento"
  );
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "duracionMontajeHrs" DOUBLE PRECISION`,
    "tratos.duracionMontajeHrs"
  );

  // Trato.ventanaMontajeInicio / ventanaMontajeFin
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "ventanaMontajeInicio" TEXT`,
    "tratos.ventanaMontajeInicio"
  );
  await run(
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "ventanaMontajeFin" TEXT`,
    "tratos.ventanaMontajeFin"
  );

  return NextResponse.json({ ok: true, resultados });
}
