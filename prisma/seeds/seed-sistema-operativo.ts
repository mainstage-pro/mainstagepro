import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OBJETIVOS: Record<string, string> = {
  "Administración":
    "Garantizar el control financiero total de Mainstage Pro: ingresos registrados, gastos documentados, cuentas cobradas, pagos ejecutados en tiempo y rentabilidad real calculada por evento.",
  "Marketing":
    "Fortalecer el posicionamiento digital de Mainstage Pro y generar un flujo constante de leads calificados para los tres tipos de evento: renta, producción técnica y corporativo.",
  "Ventas":
    "Generar y cerrar oportunidades comerciales que alcancen $500,000 MXN de ingreso mensual, con ticket promedio creciente y 75% de clientes recurrentes.",
  "Producción":
    "Ejecutar cada evento con el más alto nivel técnico, garantizando que lo prometido se cumpla en campo sin improvisación y con cero incidentes evitables.",
};

const KPIS_POR_AREA: Record<string, { nombre: string; meta: string; formula: string; fuente: string; orden: number }[]> = {
  "Administración": [
    { nombre: "Utilidad neta", meta: "≥ 30%", formula: "(Ingresos − Gastos totales) / Ingresos", fuente: "Estado de resultados mensual", orden: 1 },
    { nombre: "Utilidad bruta", meta: "≥ 65%", formula: "(Ingresos − Costo directo) / Ingresos", fuente: "Cierre financiero por evento", orden: 2 },
    { nombre: "Flujo de efectivo", meta: "≥ 40%", formula: "Efectivo disponible / Ingresos del período", fuente: "Flujo de caja proyectado", orden: 3 },
    { nombre: "Cumplimiento de cobros", meta: "≥ 90%", formula: "Cobros en fecha / Cobros programados", fuente: "Cartera CxC", orden: 4 },
    { nombre: "Cumplimiento de pagos", meta: "≥ 90%", formula: "Pagos en fecha / Pagos programados", fuente: "Cartera CxP", orden: 5 },
    { nombre: "% Reinversión vs utilidad", meta: "≤ 50%", formula: "Monto reinvertido / Utilidad neta", fuente: "Estado de resultados", orden: 6 },
    { nombre: "% Reparto de utilidades", meta: "≤ 20%", formula: "Monto repartido / Utilidad neta", fuente: "Estado de resultados", orden: 7 },
  ],
  "Marketing": [
    { nombre: "Leads calificados generados", meta: "≥ 50 / mes", formula: "Leads registrados desde campañas", fuente: "Reporte de ejecución de campañas", orden: 1 },
    { nombre: "Costo por lead (CPL)", meta: "≤ $120 MXN", formula: "Inversión en pauta / Leads calificados", fuente: "Reporte de resultados de campañas", orden: 2 },
    { nombre: "Costo de adquisición (CAC)", meta: "≤ $1,000 MXN", formula: "Inversión marketing / Clientes nuevos", fuente: "Campañas + Ventas", orden: 3 },
    { nombre: "ROI de marketing", meta: "≥ 7.5x", formula: "Ingresos atribuibles / Inversión marketing", fuente: "Estado de resultados + Campañas", orden: 4 },
    { nombre: "Conversión leads a ventas", meta: "≥ 10%", formula: "Ventas desde leads / Total leads", fuente: "Campañas + Ventas", orden: 5 },
    { nombre: "Crecimiento de seguidores", meta: "Creciente", formula: "Seguidores actuales − mes anterior", fuente: "Reporte contenido orgánico", orden: 6 },
    { nombre: "Engagement promedio", meta: "Creciente", formula: "Interacciones / Alcance del período", fuente: "Reporte contenido orgánico", orden: 7 },
  ],
  "Ventas": [
    { nombre: "Tasa de conversión a venta", meta: "≥ 30%", formula: "Oportunidades cerradas / Total abiertas", fuente: "Pipeline + Reporte ventas", orden: 1 },
    { nombre: "Ticket promedio por venta", meta: "≥ $30,000 MXN", formula: "Ingresos del mes / Eventos cerrados", fuente: "Consolidado de ventas", orden: 2 },
    { nombre: "Incremento en ticket", meta: "≥ 30% anual", formula: "Ticket actual / Ticket mismo período año anterior", fuente: "Consolidado histórico", orden: 3 },
    { nombre: "Servicios vendidos", meta: "≥ 20 / mes", formula: "Total eventos cerrados en el mes", fuente: "Consolidado de ventas", orden: 4 },
    { nombre: "Satisfacción de clientes", meta: "≥ 90%", formula: "Calificaciones ≥ 8 / Total respuestas", fuente: "Reporte atención post-evento", orden: 5 },
    { nombre: "% Clientes nuevos", meta: "≥ 25%", formula: "Clientes nuevos / Total clientes del mes", fuente: "CRM", orden: 6 },
    { nombre: "% Clientes recurrentes", meta: "≥ 75%", formula: "Clientes recurrentes / Total clientes", fuente: "CRM histórico", orden: 7 },
    { nombre: "% Rentas vs total eventos", meta: "≥ 20%", formula: "Eventos renta / Total eventos", fuente: "Consolidado de ventas", orden: 8 },
    { nombre: "% Eventos producción completa", meta: "≥ 80%", formula: "Eventos producción completa / Total", fuente: "Consolidado de ventas", orden: 9 },
  ],
  "Producción": [
    { nombre: "% Eventos con éxito técnico", meta: "≥ 95%", formula: "Eventos sin falla mayor / Total eventos", fuente: "Reporte general de ejecución", orden: 1 },
    { nombre: "% Eventos sin incidentes", meta: "≥ 95%", formula: "Eventos sin incidencia / Total eventos", fuente: "Reporte general de ejecución", orden: 2 },
    { nombre: "Plan de producción ≥72 hrs antes", meta: "100%", formula: "Eventos con plan a tiempo / Total", fuente: "Ficha técnica (fecha entrega)", orden: 3 },
    { nombre: "Satisfacción del freelancer", meta: "≥ 8/10", formula: "Promedio calificaciones formulario", fuente: "Formulario de satisfacción", orden: 4 },
    { nombre: "Desviación costo real vs presupuesto", meta: "≤ 5%", formula: "(Costo real − Presupuesto) / Presupuesto × 100", fuente: "Cálculo de pagos + Presupuesto", orden: 5 },
    { nombre: "% Equipos en óptimo estado", meta: "≥ 90%", formula: "Equipos sin falla / Total revisados", fuente: "Reporte de revisión de equipos", orden: 6 },
    { nombre: "% Proyectos cerrados ≤ 48 hrs post-evento", meta: "100%", formula: "Proyectos cerrados en tiempo / Total", fuente: "Reporte general de ejecución", orden: 7 },
  ],
};

const KPIS_TRANSVERSALES = [
  { nombre: "Nómina vs ventas totales", meta: "≤ 20%", formula: "Nómina total / Ingresos del mes", fuente: "Estado de resultados + Pagos freelancers", orden: 1 },
  { nombre: "Costo de ventas vs ventas", meta: "≤ 10%", formula: "Costos directos / Ingresos del mes", fuente: "Cierre financiero acumulado", orden: 2 },
  { nombre: "Marketing vs ventas", meta: "≤ 5%", formula: "Inversión marketing / Ingresos del mes", fuente: "Estado de resultados + Campañas", orden: 3 },
  { nombre: "Producción vs ventas", meta: "≤ 5%", formula: "Costos producción / Ingresos del mes", fuente: "Cálculo de pagos + Cierre financiero", orden: 4 },
  { nombre: "Comisiones vs ventas", meta: "≤ 8%", formula: "Comisiones pagadas / Ingresos del mes", fuente: "Reporte de comisiones + Ventas", orden: 5 },
  { nombre: "Técnicos vs ventas", meta: "≤ 15%", formula: "Honorarios técnicos / Ingresos del mes", fuente: "Reporte de cálculo de pagos", orden: 6 },
  { nombre: "Reparaciones vs ventas", meta: "≤ 1.5%", formula: "Gasto reparaciones / Ingresos del mes", fuente: "Reporte de reparación y equipos", orden: 7 },
  { nombre: "Equipo subarrendado vs ventas", meta: "≤ 10%", formula: "Costo subrentas / Ingresos del mes", fuente: "Reporte de equipos subarrendados", orden: 8 },
];

export async function seedSistemaOperativo() {
  const areas = await prisma.pTArea.findMany();
  let kpisCreados = 0;
  let objetivosActualizados = 0;

  for (const area of areas) {
    const objetivo = OBJETIVOS[area.nombre];
    if (objetivo) {
      await prisma.pTArea.update({ where: { id: area.id }, data: { objetivo } });
      objetivosActualizados++;
    }

    const kpisArea = KPIS_POR_AREA[area.nombre] ?? [];
    for (const kpi of kpisArea) {
      const existing = await prisma.pTKPI.findFirst({ where: { nombre: kpi.nombre, areaId: area.id } });
      if (!existing) {
        await prisma.pTKPI.create({ data: { ...kpi, areaId: area.id, esTransversal: false, activo: true } });
        kpisCreados++;
      }
    }
  }

  // KPIs transversales
  for (const kpi of KPIS_TRANSVERSALES) {
    const existing = await prisma.pTKPI.findFirst({ where: { nombre: kpi.nombre, esTransversal: true } });
    if (!existing) {
      await prisma.pTKPI.create({ data: { ...kpi, areaId: null, esTransversal: true, activo: true } });
      kpisCreados++;
    }
  }

  console.log(`[seed-so] ${objetivosActualizados} objetivos, ${kpisCreados} KPIs creados`);
  return { objetivosActualizados, kpisCreados };
}

if (require.main === module) {
  seedSistemaOperativo().then(console.log).finally(() => prisma.$disconnect());
}
