import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ONE-TIME migration + seed endpoint — DELETE AFTER USE
const SECRET = "ms-kpi-migrate-2026";

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const results: string[] = [];

  // Step 1: Add columns (idempotent — IF NOT EXISTS)
  const alterStatements = [
    `ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS descripcion TEXT`,
    `ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS proposito TEXT`,
    `ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS "tipoCalculo" TEXT NOT NULL DEFAULT 'manual'`,
    `ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS "notaCalculo" TEXT`,
    `ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS "valorManual" DOUBLE PRECISION`,
    `ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS "fechaValorManual" TIMESTAMP(3)`,
  ];

  for (const sql of alterStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push(`✅ ${sql.split(" ADD")[0].trim()}... OK`);
    } catch (e) {
      results.push(`⚠️ ${sql.substring(0, 60)}... ${(e as Error).message}`);
    }
  }

  // Step 2: Seed tipoCalculo values
  const tipos: Record<string, string> = {
    "utilidad-neta": "automatico",
    "utilidad-bruta": "automatico",
    "flujo-de-efectivo": "automatico",
    "leads-calificados-generados": "automatico",
    "conversion-leads-a-ventas": "automatico",
    "ticket-promedio-por-venta": "automatico",
    "servicios-vendidos": "automatico",
    "clientes-nuevos": "automatico",
    "clientes-recurrentes": "automatico",
    "costo-por-lead-cpl": "mixto",
    "costo-de-adquisicion-cac": "mixto",
    "roi-de-marketing": "mixto",
    "tasa-de-conversion-a-venta": "mixto",
  };

  let tiposUpdated = 0;
  for (const [slug, tipo] of Object.entries(tipos)) {
    const r = await prisma.pTKPI.updateMany({ where: { slug }, data: { tipoCalculo: tipo } });
    tiposUpdated += r.count;
  }
  results.push(`✅ tipoCalculo seeded: ${tiposUpdated} KPIs updated`);

  // Step 3: Seed descriptions + proposito for priority KPIs
  const descripciones: Record<string, { descripcion: string; proposito: string }> = {
    "utilidad-neta": {
      descripcion: "Porcentaje de ganancia real después de todos los costos y gastos del período",
      proposito: "Medir si el negocio es rentable. Si baja de 30% se requiere acción inmediata",
    },
    "utilidad-bruta": {
      descripcion: "Porcentaje que queda después de restar solo los costos directos de los eventos",
      proposito: "Medir la rentabilidad de la operación sin contar gastos fijos",
    },
    "flujo-de-efectivo": {
      descripcion: "Relación entre el efectivo real disponible y los ingresos del período",
      proposito: "Medir liquidez. Un negocio puede tener utilidad y quedarse sin caja",
    },
    "leads-calificados-generados": {
      descripcion: "Número de contactos nuevos con intención real de contratar",
      proposito: "Medir si el volumen de entrada al pipeline es suficiente para alcanzar la meta comercial",
    },
    "costo-por-lead-cpl": {
      descripcion: "Cuánto cuesta en pauta obtener un lead calificado",
      proposito: "Medir eficiencia de inversión publicitaria. Guía decisiones de presupuesto",
    },
    "ticket-promedio-por-venta": {
      descripcion: "Valor promedio de cada cotización aprobada en el período",
      proposito: "Medir si se está vendiendo con el margen correcto",
    },
    "tasa-de-conversion-a-venta": {
      descripcion: "Porcentaje de oportunidades abiertas que terminan en venta cerrada",
      proposito: "Medir la efectividad del proceso comercial",
    },
  };

  let descUpdated = 0;
  for (const [slug, data] of Object.entries(descripciones)) {
    const r = await prisma.pTKPI.updateMany({ where: { slug }, data });
    descUpdated += r.count;
  }
  results.push(`✅ Descripciones seeded: ${descUpdated} KPIs updated`);

  return NextResponse.json({ ok: true, results });
}
