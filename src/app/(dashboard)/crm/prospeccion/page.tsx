import { prisma } from "@/lib/prisma";
import ProspeccionClient from "./ProspeccionClient";

export default async function ProspeccionPage() {
  const [usuarios, counts] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.prospeccion.groupBy({
      by: ["etapa", "tipo", "estado"],
      _count: { id: true },
      where: { estado: { notIn: ["CONVERTIDO", "CANCELADO"] } },
    }),
  ]);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <ProspeccionClient usuarios={usuarios} serverCounts={counts} />
    </div>
  );
}
