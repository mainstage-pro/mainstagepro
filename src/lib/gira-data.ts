// Lectura compartida de una gira con sus shows. El layout de la gira (resumen
// de avance en la cabecera) y la pestaña de shows piden exactamente el mismo
// renglón de la base en cada navegación; `cache()` de React dedupea esas dos
// llamadas dentro del mismo render del servidor, como documenta Next en
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md
// ("Fetching Data" — layouts no pueden pasar props a children, así que ambos
// vuelven a pedir el dato; cache() evita que sea dos viajes a Neon).
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const obtenerGiraConShows = cache((id: string) =>
  prisma.gira.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      estado: true,
      fechaInicio: true,
      fechaFin: true,
      artistaId: true,
      artista: { select: { nombre: true } },
      shows: {
        orderBy: [{ fecha: "asc" }, { orden: "asc" }],
        include: {
          venue: { select: { id: true, nombre: true, ciudad: true, estado: true, capacidadPersonas: true } },
          repartos: { select: { prioridad: true, estado: true, cubiertoPor: true } },
          _count: { select: { crew: true, momentos: true } },
        },
      },
    },
  }),
);
