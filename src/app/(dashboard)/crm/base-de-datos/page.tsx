import { prisma } from "@/lib/prisma";
import ProspectosClient from "./BaseDeDatosClient";

export default async function ProspectosPage() {
  const [leads, usuarios] = await Promise.all([
    // Prospectos: esProspecto=true O tienen tratos sin VENTA_CERRADA
    prisma.cliente.findMany({
      where: {
        OR: [
          { esProspecto: true },
          { tipoCliente: "POR_DESCUBRIR" },
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
        // Traer el trato más reciente para mostrar origenLead y etapa
        tratos: {
          select: { id: true, etapa: true, origenLead: true, nombreEvento: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
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
      <ProspectosClient leads={leads} usuarios={usuarios} />
    </div>
  );
}
