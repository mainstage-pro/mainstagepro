import { prisma } from '../lib/prisma';

async function main() {
  // Clear existing Q3 2026 OKRs
  const existing = await prisma.objetivoTrimestral.findMany({
    where: { trimestre: 'Q3', anio: 2026 },
    select: { id: true },
  });
  if (existing.length > 0) {
    await prisma.keyResult.deleteMany({
      where: { objetivoId: { in: existing.map(e => e.id) } },
    });
    await prisma.objetivoTrimestral.deleteMany({
      where: { trimestre: 'Q3', anio: 2026 },
    });
  }

  // Ventas
  await prisma.objetivoTrimestral.create({
    data: {
      area: 'VENTAS',
      trimestre: 'Q3',
      anio: 2026,
      objetivo: 'Construir la infraestructura comercial de Mainstage Pro para que el proceso de venta sea replicable, predecible y no dependa de la improvisación.',
      keyResults: {
        create: [
          {
            descripcion: '100% de los materiales comerciales listos y en uso — presentaciones, paquetes por segmento, fotos, propuestas y herramientas de cotización — antes del 31 de julio.',
            tipo: 'porcentaje',
            meta: 100,
            progreso: 0,
          },
          {
            descripcion: '100% del pipeline activo operando bajo proceso diferenciado por tipo de cliente (inactivo, activo, frecuente, priority) con seguimiento documentado en plataforma.',
            tipo: 'porcentaje',
            meta: 100,
            progreso: 0,
          },
          {
            descripcion: 'Mínimo 15 prospectos outbound contactados por semana con registro en CRM, sostenido durante los 3 meses del trimestre.',
            tipo: 'numero',
            meta: 15,
            metaTexto: '15 por semana',
            progreso: 0,
            conexionAuto: 'outbound_q3',
          },
        ],
      },
    },
  });

  // Marketing
  await prisma.objetivoTrimestral.create({
    data: {
      area: 'MARKETING',
      trimestre: 'Q3',
      anio: 2026,
      objetivo: 'Convertir el área de marketing en un motor de generación de demanda predecible con métricas claras, contenido constante y campañas optimizadas para los tres segmentos.',
      keyResults: {
        create: [
          {
            descripcion: 'Mínimo 20 leads calificados por mes sostenidos durante Q3, distribuidos en los tres segmentos, con costo por lead ≤ $300 MXN.',
            tipo: 'numero',
            meta: 20,
            metaTexto: '20 por mes',
            progreso: 0,
            conexionAuto: 'leads_q3',
          },
          {
            descripcion: 'Publicación constante durante los 3 meses — mínimo 3 posts + 1 reel por semana — con crecimiento medible de seguidores y engagement mes a mes.',
            tipo: 'porcentaje',
            meta: 100,
            metaTexto: '% de semanas cumplidas',
            progreso: 0,
          },
          {
            descripcion: 'Reporte semanal de resultados operando sin falta desde el inicio de Q3, cubriendo métricas de campañas, contenido publicado y propuesta de mejora documentada.',
            tipo: 'porcentaje',
            meta: 100,
            metaTexto: '% de semanas con reporte',
            progreso: 0,
          },
        ],
      },
    },
  });

  console.log('✅ Seed Q3 2026 OKRs completado');
}

main().catch(console.error).finally(() => prisma.$disconnect());
