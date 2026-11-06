import { prisma } from "@/lib/prisma";
import ServiciosClient from "@/app/(dashboard)/giras/(hub)/servicios/ServiciosClient";

export const dynamic = "force-dynamic";

export default async function ServiciosGrupoCreativePage() {
  const servicios = await prisma.servicioPM.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: { _count: { select: { lineas: true } } },
  });

  return (
    <ServiciosClient
      unidadFija="CREATIVE"
      servicios={servicios.map((s) => ({
        id: s.id,
        clave: s.clave,
        nombre: s.nombre,
        categoria: s.categoria,
        subcategoria: s.subcategoria,
        icono: s.icono,
        nivelServicio: s.nivelServicio,
        unidad: s.unidad,
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
