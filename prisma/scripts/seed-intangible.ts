/**
 * Crea el activo intangible "Plataforma Mainstage Pro" en BD si no existe.
 * Ejecutar: npx tsx prisma/scripts/seed-intangible.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existe = await prisma.hervamActivo.findFirst({
    where: { categoria: "INTANGIBLE", nombre: { contains: "Plataforma", mode: "insensitive" } },
  });

  if (existe) {
    console.log(`✅ Ya existe: "${existe.nombre}" (id: ${existe.id}) — valorAdquisicion: $${existe.valorAdquisicion}`);
    return;
  }

  const activo = await prisma.hervamActivo.create({
    data: {
      nombre: "Plataforma Mainstage Pro",
      descripcion: "Sistema de gestión integral: CRM, inventario, finanzas, RRHH, producción y reportes",
      categoria: "INTANGIBLE",
      propietario: "MAINSTAGE",
      cantidad: 1,
      valorAdquisicion: 100000,
      valorActual: 100000,
      precioRenta: 0,
      notas: "Activo intangible — plataforma de software propietaria",
    },
  });

  console.log(`🎉 Activo creado: "${activo.nombre}" id=${activo.id} valor=$${activo.valorAdquisicion}`);
}

main()
  .catch((e) => { console.error("Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
