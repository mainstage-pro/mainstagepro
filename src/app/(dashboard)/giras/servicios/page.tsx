import { prisma } from "@/lib/prisma";
import ServiciosClient from "./ServiciosClient";

export const dynamic = "force-dynamic";

export default async function ServiciosPMPage() {
  const servicios = await prisma.servicioPM.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: { _count: { select: { lineas: true } } },
  });

  return (
    <ServiciosClient
      servicios={servicios.map((s) => ({
        id: s.id,
        clave: s.clave,
        nombre: s.nombre,
        categoria: s.categoria,
        descripcion: s.descripcion,
        entregables: s.entregables,
        incluye: s.incluye,
        noIncluye: s.noIncluye,
        unidadDefault: s.unidadDefault,
        tipoLinea: s.tipoLinea,
        precioSugerido: s.precioSugerido,
        costoSugerido: s.costoSugerido,
        activo: s.activo,
        orden: s.orden,
        usos: s._count.lineas,
      }))}
    />
  );
}
