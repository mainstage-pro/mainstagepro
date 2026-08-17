import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperacionTecnicaColumns } from "@/lib/migraciones-lazy";
import { ordenarRolesTecnicos } from "@/lib/rolesTecnicos";

/**
 * GET /api/roles-tecnicos/publico
 * Endpoint público (sin autenticación) que devuelve los roles técnicos VIGENTES
 * (activos), sin tarifas. Alimenta las categorías de servicio "Servicio de DJ" y
 * "Operación técnica" del formulario de descubrimiento del cliente.
 */
export async function GET() {
  await ensureOperacionTecnicaColumns();

  const roles = await prisma.rolTecnico.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      disciplina: true,
      descripcion: true,
    },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ roles: ordenarRolesTecnicos(roles) });
}
