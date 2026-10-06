import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtFechaCorta } from "@/lib/giras";
import PersonasArtistaClient, { type PersonaFila, type UsoItem, type UsoPersona } from "./PersonasArtistaClient";

export const dynamic = "force-dynamic";

export default async function ArtistaPersonasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const artista = await prisma.artista.findUnique({
    where: { id },
    select: { id: true, activo: true, integrantesNum: true },
  });
  if (!artista || !artista.activo) notFound();

  const personas = await prisma.artistaPersona.findMany({
    where: { artistaId: id, activo: true },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      nombre: true,
      rol: true,
      instrumento: true,
      esIntegrante: true,
      esContactoClave: true,
      telefono: true,
      email: true,
      tallaPlayera: true,
      notasHospitalidad: true,
      notas: true,
      orden: true,

      // El directorio solo sirve si se ve dónde aterriza cada persona: en qué
      // riders sale, en el crew de qué giras va, qué fechas promueve y de qué
      // gira es el contacto principal.
      riderContactos: {
        where: { rider: { activo: true } },
        orderBy: { orden: "asc" },
        select: {
          riderId: true,
          rider: { select: { nombre: true, version: true, contexto: true } },
        },
      },
      crew: {
        where: { activo: true, gira: { activo: true } },
        orderBy: { createdAt: "asc" },
        select: {
          giraId: true,
          showId: true,
          funcion: true,
          gira: { select: { nombre: true } },
        },
      },
      giras: {
        where: { activo: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, nombre: true },
      },
      showsComoPromotor: {
        where: { gira: { activo: true } },
        orderBy: { fecha: "asc" },
        select: { id: true, giraId: true, fecha: true, ciudad: true },
      },
    },
  });

  const filas: PersonaFila[] = personas.map(({ riderContactos, crew, giras, showsComoPromotor, ...campos }) => {
    // Una persona puede figurar dos veces en la lista de contactos del mismo
    // rider; en la mención solo importa el rider, no el renglón.
    const riders: UsoItem[] = [];
    const vistos = new Set<string>();
    for (const c of riderContactos) {
      if (vistos.has(c.riderId)) continue;
      vistos.add(c.riderId);
      riders.push({
        href: `/giras/artista/${id}/rider/${c.riderId}/contactos`,
        texto: `${c.rider.nombre} · v${c.rider.version}`,
        detalle: `Contexto ${c.rider.contexto}`,
      });
    }

    // El crew se captura por fecha: la misma persona genera un renglón por show
    // de la gira. Se colapsa a una mención por gira o el directorio se vuelve
    // ilegible en cuanto hay una gira de veinte fechas.
    const porGira = new Map<string, { nombre: string; fechas: number; todaLaGira: boolean; funciones: Set<string> }>();
    for (const c of crew) {
      const acc =
        porGira.get(c.giraId) ?? { nombre: c.gira.nombre, fechas: 0, todaLaGira: false, funciones: new Set<string>() };
      if (c.showId) acc.fechas += 1;
      else acc.todaLaGira = true;
      if (c.funcion) acc.funciones.add(c.funcion);
      porGira.set(c.giraId, acc);
    }

    const crewItems: UsoItem[] = [...porGira.entries()].map(([giraId, g]) => {
      const alcance = g.todaLaGira ? "toda la gira" : `${g.fechas} ${g.fechas === 1 ? "fecha" : "fechas"}`;
      return {
        href: `/giras/${giraId}/crew`,
        texto: g.nombre,
        detalle: [g.funciones.size ? [...g.funciones].join(" / ") : null, alcance].filter(Boolean).join(" · "),
      };
    });

    const promotor: UsoItem[] = showsComoPromotor.map((s) => ({
      href: `/giras/${s.giraId}/show/${s.id}`,
      texto: [`${fmtFechaCorta(s.fecha)} ${s.fecha.getUTCFullYear()}`, s.ciudad].filter(Boolean).join(" · "),
      detalle: "Promotor de la fecha",
    }));

    const contactoPrincipal: UsoItem[] = giras.map((g) => ({
      href: `/giras/${g.id}`,
      texto: g.nombre,
      detalle: "Contacto principal de la gira",
    }));

    const uso: UsoPersona = { riders, crew: crewItems, promotor, contactoPrincipal };
    return { ...campos, uso };
  });

  return (
    <PersonasArtistaClient artistaId={id} integrantesNum={artista.integrantesNum} personasIniciales={filas} />
  );
}
