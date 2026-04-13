import { prisma } from "@/lib/prisma";
import ClientesClient from "./ClientesClient";

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    include: {
      _count: { select: { tratos: true, proyectos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <ClientesClient clientes={clientes} />
    </div>
  );
}
