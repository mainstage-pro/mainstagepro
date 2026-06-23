import { prisma } from "@/lib/prisma";
import BaseDeDatosClient from "./BaseDeDatosClient";

export default async function BaseDeDatosPage() {
  const [clientes, prospecciones, usuarios] = await Promise.all([
    // ── Base de datos de Clientes (B2B, B2C, POR_DESCUBRIR) ──────────────────
    prisma.cliente.findMany({
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

    // ── Base de datos de Prospectos ──────────────────────────────────────────
    prisma.prospeccion.findMany({
      select: {
        id: true,
        tipo: true,
        etapa: true,
        estado: true,
        tipoEvento: true,
        origen: true,
        fechaProximoContacto: true,
        tipoServicioInteres: true,
        contacto1Hecho: true,
        contacto2Hecho: true,
        contacto3Hecho: true,
        contacto4Hecho: true,
        contacto5Hecho: true,
        notas: true,
        createdAt: true,
        cliente: {
          select: {
            id: true, nombre: true, empresa: true, telefono: true,
            correo: true, tipoCliente: true, clasificacion: true,
          },
        },
        responsable: { select: { id: true, name: true } },
        trato: { select: { id: true, etapa: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // ── Usuarios activos (para filtros de vendedor/responsable) ──────────────
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <BaseDeDatosClient
        clientes={clientes as Parameters<typeof BaseDeDatosClient>[0]["clientes"]}
        prospecciones={prospecciones as Parameters<typeof BaseDeDatosClient>[0]["prospecciones"]}
        usuarios={usuarios}
      />
    </div>
  );
}
