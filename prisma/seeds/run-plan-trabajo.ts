/**
 * Seed: Plan de Trabajo — Sistema Operativo v2.0
 * Lee el JSON con las 144 tareas y las carga en DB usando upsert para ser idempotente.
 *
 * Ejecutar via API: POST /api/admin/seed-plan-trabajo  (requiere sesión ADMIN)
 * O directamente:  npx ts-node prisma/seeds/run-plan-trabajo.ts
 */

import { PrismaClient } from "@prisma/client";
import seedData from "./plan-trabajo-seed.json";

const prisma = new PrismaClient();

interface TareaDef {
  nombre: string;
  descripcion?: string;
  tipo: string;
  frecuencia: string;
  diasSemana?: number[];
  semanaDeMes?: number[];
  diaDelMes?: number;
  horaLimite?: string;
  responsable?: { email: string; nombre: string };
  moduloDestino?: string;
  moduloTexto?: string;
  orden: number;
}

interface SubAreaDef {
  nombre: string;
  orden: number;
  entregables?: string[];
  tareas: TareaDef[];
}

interface AreaDef {
  area: {
    nombre: string;
    color: string;
    icono?: string;
    objetivo?: string;
  };
  subareas: SubAreaDef[];
}

export async function seedPlanTrabajo() {
  const data = seedData as AreaDef[];
  let totalTemplates = 0;
  let totalAreas = 0;
  let totalSubareas = 0;

  // Cache de usuarios por email
  const userCache: Record<string, string | null> = {};
  async function getUserId(email?: string): Promise<string | null> {
    if (!email) return null;
    if (email in userCache) return userCache[email];
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    userCache[email] = user?.id ?? null;
    return userCache[email];
  }

  for (const areaData of data) {
    const { area, subareas } = areaData;

    // Upsert área
    const ptArea = await prisma.pTArea.upsert({
      where: { nombre: area.nombre },
      update: { color: area.color, icono: area.icono, objetivo: area.objetivo },
      create: {
        nombre: area.nombre,
        color: area.color,
        icono: area.icono ?? null,
        objetivo: area.objetivo ?? null,
        orden: data.indexOf(areaData),
      },
    });
    totalAreas++;

    for (const subAreaData of subareas) {
      // Upsert subárea (buscar por nombre+areaId)
      const existing = await prisma.pTSubArea.findFirst({
        where: { areaId: ptArea.id, nombre: subAreaData.nombre },
      });

      const ptSubArea = existing
        ? await prisma.pTSubArea.update({
            where: { id: existing.id },
            data: { orden: subAreaData.orden, entregables: subAreaData.entregables ?? [] },
          })
        : await prisma.pTSubArea.create({
            data: {
              areaId: ptArea.id,
              nombre: subAreaData.nombre,
              orden: subAreaData.orden,
              entregables: subAreaData.entregables ?? [],
            },
          });
      totalSubareas++;

      for (const tarea of subAreaData.tareas) {
        const responsableId = await getUserId(tarea.responsable?.email);

        // Upsert template (por nombre+subAreaId)
        const existingT = await prisma.pTTareaTemplate.findFirst({
          where: { subAreaId: ptSubArea.id, nombre: tarea.nombre },
        });

        const templateData = {
          areaId: ptArea.id,
          subAreaId: ptSubArea.id,
          responsableId,
          nombre: tarea.nombre,
          descripcion: tarea.descripcion ?? null,
          tipo: tarea.tipo, // CHECK | ENTREGABLE
          frecuencia: tarea.frecuencia,
          diasSemana: tarea.diasSemana ?? [],
          semanaDeMes: tarea.semanaDeMes ?? [],
          diaDelMes: tarea.diaDelMes ?? null,
          horaLimite: tarea.horaLimite ?? null,
          moduloDestino: tarea.moduloDestino ?? null,
          moduloTexto: tarea.moduloTexto ?? null,
          activa: true,
          orden: tarea.orden,
        };

        if (existingT) {
          await prisma.pTTareaTemplate.update({ where: { id: existingT.id }, data: templateData });
        } else {
          await prisma.pTTareaTemplate.create({ data: templateData });
        }
        totalTemplates++;
      }
    }
  }

  return { totalAreas, totalSubareas, totalTemplates };
}

// Run directo si se ejecuta como script
if (require.main === module) {
  seedPlanTrabajo()
    .then(r => {
      console.log(`✅ Seed completado: ${r.totalAreas} áreas, ${r.totalSubareas} subáreas, ${r.totalTemplates} templates`);
      process.exit(0);
    })
    .catch(e => {
      console.error("❌ Error en seed:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
