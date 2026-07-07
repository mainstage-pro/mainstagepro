import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProspeccionDetalle from "./ProspeccionDetalle";

export default async function ProspeccionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [prospeccion, usuarios] = await Promise.all([
    prisma.prospeccion.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true, nombre: true, empresa: true, empresaId: true,
            telefono: true, correo: true, tipoCliente: true, clasificacion: true,
          },
        },
        responsable: { select: { id: true, name: true } },
        trato: { select: { id: true, etapa: true, nombreEvento: true, createdAt: true } },
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!prospeccion) notFound();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <ProspeccionDetalle prospeccion={prospeccion as Parameters<typeof ProspeccionDetalle>[0]["prospeccion"]} usuarios={usuarios} />
    </div>
  );
}
