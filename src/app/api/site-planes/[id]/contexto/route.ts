import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type ContextoSitePlan, CONTEXTO_VACIO } from "@/lib/site-plan";

export const dynamic = "force-dynamic";

/**
 * Lo que Mainstage ya sabe del show y que la ficha de un elemento del plano no
 * debería volver a preguntar: quién está en el crew, qué pide el rider, qué
 * proveedores vienen y en qué ventanas se monta.
 *
 * Un plano puede ser una plantilla de venue sin show, y un show puede no tener
 * proyecto. En los dos casos el endpoint responde con listas vacías en vez de
 * fallar: la ficha se llena a mano y el plano sigue sirviendo.
 */

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const plan = await prisma.sitePlan.findUnique({
    where: { id },
    select: { showId: true, venueId: true },
  });
  if (!plan) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const venueDirecto = plan.venueId
    ? await prisma.venue.findUnique({
        where: { id: plan.venueId },
        select: {
          nombre: true,
          capacidadPersonas: true,
          voltajeDisponible: true,
          amperajeTotal: true,
          fases: true,
          puntoDescarga: true,
          notasTecnicas: true,
        },
      })
    : null;

  if (!plan.showId) {
    return NextResponse.json({ ...CONTEXTO_VACIO, venue: venueDirecto } satisfies ContextoSitePlan);
  }

  const show = await prisma.giraShow.findUnique({
    where: { id: plan.showId },
    select: {
      giraId: true,
      proyectoId: true,
      aforoEsperado: true,
      horaLoadIn: true,
      horaLoadOut: true,
      contactoCasaNombre: true,
      contactoCasaTelefono: true,
      venue: {
        select: {
          nombre: true,
          capacidadPersonas: true,
          voltajeDisponible: true,
          amperajeTotal: true,
          fases: true,
          puntoDescarga: true,
          notasTecnicas: true,
        },
      },
    },
  });
  if (!show) return NextResponse.json({ ...CONTEXTO_VACIO, venue: venueDirecto } satisfies ContextoSitePlan);

  // El crew del show y el de la gira completa: a quien monta una carpa puede que
  // no se le haya asignado ese show en particular.
  const [crew, rider, bloques, proveedores] = await Promise.all([
    prisma.giraCrew.findMany({
      where: { activo: true, OR: [{ showId: plan.showId }, { giraId: show.giraId, showId: null }] },
      select: {
        id: true,
        funcion: true,
        telefono: true,
        nombreLibre: true,
        tecnico: { select: { nombre: true } },
        persona: { select: { nombre: true } },
        rolTecnico: { select: { nombre: true } },
      },
      orderBy: { orden: "asc" },
    }),
    prisma.showRiderLinea.findMany({
      where: { showId: plan.showId },
      select: {
        id: true,
        concepto: true,
        disciplina: true,
        cantidadPedida: true,
        equipo: { select: { marca: true, modelo: true } },
      },
      orderBy: [{ disciplina: "asc" }, { orden: "asc" }],
    }),
    prisma.giraShowBloque.findMany({
      where: { showId: plan.showId },
      select: { id: true, titulo: true, tipo: true, hora: true, horaFin: true },
      orderBy: { orden: "asc" },
    }),
    show.proyectoId
      ? prisma.proveedorEvento.findMany({
          where: { proyectoId: show.proyectoId },
          select: {
            id: true,
            nombreProveedor: true,
            servicioEquipo: true,
            responsable: true,
            telefonoProveedor: true,
          },
          orderBy: { nombreProveedor: "asc" },
        })
      : Promise.resolve([]),
  ]);

  // El proveedor del rider también cuenta: ahí es donde se captura el equipo de
  // tercero, y de ahí se derivan los ProveedorEvento.
  const proveedoresRider = await prisma.showRiderLinea.findMany({
    where: { showId: plan.showId, proveedorId: { not: null } },
    select: { proveedor: { select: { id: true, nombre: true, telefono: true, giro: true } } },
    distinct: ["proveedorId"],
  });

  const responsables: ContextoSitePlan["responsables"] = crew.map(c => ({
    id: c.id,
    nombre: c.tecnico?.nombre ?? c.persona?.nombre ?? c.nombreLibre ?? "Sin nombre",
    detalle: c.rolTecnico?.nombre ?? c.funcion,
    contacto: c.telefono,
  }));
  if (show.contactoCasaNombre) {
    responsables.push({
      id: "casa",
      nombre: show.contactoCasaNombre,
      detalle: "Contacto de casa",
      contacto: show.contactoCasaTelefono,
    });
  }

  const vistos = new Set<string>();
  const listaProveedores: ContextoSitePlan["proveedores"] = [];
  for (const p of proveedores) {
    vistos.add(p.nombreProveedor.toLowerCase());
    listaProveedores.push({
      id: p.id,
      nombre: p.nombreProveedor,
      detalle: p.servicioEquipo ?? p.responsable,
      contacto: p.telefonoProveedor,
    });
  }
  for (const { proveedor } of proveedoresRider) {
    if (!proveedor || vistos.has(proveedor.nombre.toLowerCase())) continue;
    vistos.add(proveedor.nombre.toLowerCase());
    listaProveedores.push({
      id: proveedor.id,
      nombre: proveedor.nombre,
      detalle: proveedor.giro,
      contacto: proveedor.telefono,
    });
  }

  const ventanas: ContextoSitePlan["ventanas"] = bloques.map(b => ({
    id: b.id,
    titulo: b.titulo,
    tipo: b.tipo,
    inicio: b.hora,
    fin: b.horaFin,
  }));
  if (show.horaLoadIn || show.horaLoadOut) {
    ventanas.unshift({
      id: "show",
      titulo: "Load in / load out del show",
      tipo: "LOGISTICA",
      inicio: show.horaLoadIn,
      fin: show.horaLoadOut,
    });
  }

  return NextResponse.json({
    responsables,
    proveedores: listaProveedores,
    rider: rider.map(r => ({
      id: r.id,
      concepto: r.concepto,
      detalle: [r.disciplina, [r.equipo?.marca, r.equipo?.modelo].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(" · "),
      cantidad: r.cantidadPedida,
    })),
    ventanas,
    venue: show.venue ?? venueDirecto,
    aforoEsperado: show.aforoEsperado,
  } satisfies ContextoSitePlan);
}
