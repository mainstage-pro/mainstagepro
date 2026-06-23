import { prisma } from "@/lib/prisma";
import LeadsClient from "./BaseDeDatosClient";

export default async function LeadsPage() {
  const [leads, usuarios] = await Promise.all([
    // Solo los que son prospectos: tipoCliente POR_DESCUBRIR o esProspecto = true
    prisma.cliente.findMany({
      where: {
        OR: [
          { tipoCliente: "POR_DESCUBRIR" },
          { esProspecto: true },
        ],
      },
      select: {
        id: true,
        nombre: true,
        empresa: true,
        correo: true,
        telefono: true,
        tipoCliente: true,
        clasificacion: true,
        servicioUsual: true,
        tiposEvento: true,
        esProspecto: true,
        vendedorId: true,
        compania: { select: { id: true, nombre: true } },
        vendedor: { select: { id: true, name: true } },
        _count: { select: { tratos: true, proyectos: true, prospecciones: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <LeadsClient leads={leads} usuarios={usuarios} />
    </div>
  );
}
