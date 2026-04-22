import { prisma } from "@/lib/prisma";
import ClientesClient from "./ClientesClient";

export default async function ClientesPage() {
  const [clientes, usuarios] = await Promise.all([
    prisma.cliente.findMany({
      include: {
        _count: { select: { tratos: true, proyectos: true } },
        vendedor: { select: { id: true, name: true } },
        compania: { select: { id: true, nombre: true } },
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
      <ClientesClient clientes={clientes} usuarios={usuarios} />
    </div>
  );
}
