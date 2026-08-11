import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";
import TareasClientesClient from "./TareasClientesClient";

export const dynamic = "force-dynamic";

// Vista global de las tareas de atención al cliente (tipoOrigen CLIENTE): recurrencia
// de eventos, cumpleaños, fechas especiales. Agrupa por cliente todas las tareas que
// nacen desde la ventana del cliente y aparecen en Gestión Operativa el día que toque.
export default async function TareasClientesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await ensureTareaColumns();

  const [tareas, clientes, usuarios] = await Promise.all([
    prisma.tarea.findMany({
      where: { clienteId: { not: null }, parentId: null, estado: { not: "CANCELADA" } },
      select: {
        id: true,
        titulo: true,
        prioridad: true,
        estado: true,
        fecha: true,
        recurrencia: true,
        clienteId: true,
        asignadoA: { select: { id: true, name: true } },
      },
      orderBy: [{ fecha: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
    }),
    prisma.cliente.findMany({
      select: { id: true, nombre: true, empresa: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const tareasSerializadas = tareas.map(t => ({
    ...t,
    fecha: t.fecha ? t.fecha.toISOString() : null,
  }));

  return (
    <div className="p-4 md:p-6">
      <TareasClientesClient tareas={tareasSerializadas} clientes={clientes} usuarios={usuarios} />
    </div>
  );
}
