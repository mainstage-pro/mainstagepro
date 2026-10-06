import { prisma } from "@/lib/prisma";
import { getPresentationMetadata } from "@/lib/metadata";
import GirasClient, { type ServicioGira } from "./GirasClient";

const HERO = "/images/presentacion/musicales/Musicales-016.jpg";

export async function generateMetadata() {
  return getPresentationMetadata({
    title: "Giras",
    description:
      "Production management para artistas en gira: advance plaza por plaza, documentos de producción y una sola dirección que responde por cada fecha.",
    path: "/presentacion/giras",
    image: HERO,
  });
}

export const dynamic = "force-dynamic";

/**
 * La presentación para artistas y managers: qué significa aliarse con Mainstage
 * para una gira.
 *
 * Las otras presentaciones hablan de un evento que alguien contrata. Ésta habla
 * de una temporada de fechas, así que el interlocutor no es el cliente que renta
 * sino el manager que decide con quién sale de tour.
 *
 * El alcance NO se escribe aquí: sale del catálogo `ServicioPM` que se captura
 * en `/giras/servicios`. Si se agrega un servicio de gira, esta página lo
 * anuncia sin que nadie la edite; y nunca puede ofrecer algo que no exista.
 * Van sin precio a propósito: el número se negocia en la propuesta.
 */
export default async function PresentacionGirasPage() {
  const servicios: ServicioGira[] = await prisma.servicioPM.findMany({
    where: { activo: true, nivelServicio: { in: ["GIRA", "AMBOS"] } },
    select: {
      clave: true,
      nombre: true,
      categoria: true,
      descripcion: true,
      icono: true,
      unidadDefault: true,
    },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  return <GirasClient servicios={servicios} hero={HERO} />;
}
