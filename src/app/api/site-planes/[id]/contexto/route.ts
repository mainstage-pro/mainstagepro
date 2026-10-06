import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type ContextoSitePlan, CONTEXTO_VACIO } from "@/lib/site-plan";
import { ordenarBloques } from "@/lib/giras";
import { horaFinDe, horasAncla } from "@/lib/show-momentos";

export const dynamic = "force-dynamic";

/**
 * Lo que Mainstage ya sabe del evento y que la ficha de un elemento del plano no
 * debería volver a preguntar: quién está en el crew, qué pide el rider, qué
 * proveedores vienen y en qué ventanas se monta.
 *
 * El plano cuelga de una fecha de gira o de un proyecto de eventos, y las dos
 * procedencias llenan los mismos cuatro renglones desde sus propias tablas. Un
 * plano puede además ser una plantilla de venue sin dueño, y un show puede no
 * tener proyecto: en esos casos el endpoint responde con listas vacías en vez de
 * fallar, la ficha se llena a mano y el plano sigue sirviendo.
 */

type Params = { params: Promise<{ id: string }> };

const SELECT_VENUE = {
  nombre: true,
  capacidadPersonas: true,
  voltajeDisponible: true,
  amperajeTotal: true,
  fases: true,
  puntoDescarga: true,
  notasTecnicas: true,
} as const;

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const plan = await prisma.sitePlan.findUnique({
    where: { id },
    select: { showId: true, proyectoId: true, venueId: true },
  });
  if (!plan) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const venueDirecto = plan.venueId
    ? await prisma.venue.findUnique({ where: { id: plan.venueId }, select: SELECT_VENUE })
    : null;

  if (plan.proyectoId) {
    return NextResponse.json(await contextoDeProyecto(plan.proyectoId, venueDirecto));
  }

  if (!plan.showId) {
    return NextResponse.json({ ...CONTEXTO_VACIO, venue: venueDirecto } satisfies ContextoSitePlan);
  }

  const show = await prisma.giraShow.findUnique({
    where: { id: plan.showId },
    select: {
      giraId: true,
      proyectoId: true,
      aforoEsperado: true,
      contactoCasaNombre: true,
      contactoCasaTelefono: true,
      // Las ventanas de montaje salen del día del show: un renglón por momento,
      // con su inicio y su fin. Antes había que leerlas en dos lugares (las
      // columnas de hora del show y los bloques) y se contaban doble.
      momentos: {
        select: { id: true, llave: true, titulo: true, tipo: true, hora: true, horaFin: true, orden: true },
        orderBy: { orden: "asc" },
      },
      venue: { select: SELECT_VENUE },
    },
  });
  if (!show) return NextResponse.json({ ...CONTEXTO_VACIO, venue: venueDirecto } satisfies ContextoSitePlan);

  // El crew del show y el de la gira completa: a quien monta una carpa puede que
  // no se le haya asignado ese show en particular.
  const [crew, rider, proveedores] = await Promise.all([
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

  const ventanas: ContextoSitePlan["ventanas"] = ordenarBloques(show.momentos).map(m => ({
    id: m.id,
    titulo: m.titulo,
    tipo: m.tipo,
    inicio: m.hora,
    fin: m.horaFin,
  }));
  // La jornada completa no es un momento: es de donde empieza a entrar el equipo
  // a donde acaba de salir. Es la ventana que más se elige en la ficha de un
  // elemento del plano, así que se ofrece armada.
  const horas = horasAncla(show.momentos);
  const finJornada = horaFinDe(show.momentos, "LOAD_OUT") ?? horas.loadOut ?? horas.curfew;
  if (horas.loadIn || finJornada) {
    ventanas.unshift({
      id: "jornada",
      titulo: "Load in → load out",
      tipo: "LOGISTICA",
      inicio: horas.loadIn,
      fin: finJornada,
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

/**
 * El mismo contexto, visto desde un proyecto de eventos. Las cuatro listas salen
 * de las tablas del proyecto en vez de las del show: el crew de `ProyectoPersonal`,
 * el equipo de `ProyectoEquipo`, los proveedores de `ProveedorEvento` y las
 * ventanas de los bloques de logística. El contrato de salida es idéntico, así que
 * la ficha de un elemento del plano no distingue de dónde viene.
 */
async function contextoDeProyecto(
  proyectoId: string,
  venueDirecto: ContextoSitePlan["venue"],
): Promise<ContextoSitePlan> {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      encargadoCliente: true,
      encargadoClienteContacto: true,
      venue: { select: SELECT_VENUE },
    },
  });
  if (!proyecto) return { ...CONTEXTO_VACIO, venue: venueDirecto };

  const [personal, equipos, proveedores, bloques] = await Promise.all([
    prisma.proyectoPersonal.findMany({
      where: { proyectoId },
      select: {
        id: true,
        responsabilidad: true,
        rolEnEvento: true,
        coordinaEnSitio: true,
        tecnico: { select: { nombre: true, celular: true } },
        rolTecnico: { select: { nombre: true } },
      },
      orderBy: [{ coordinaEnSitio: "desc" }, { id: "asc" }],
    }),
    prisma.proyectoEquipo.findMany({
      where: { proyectoId },
      select: {
        id: true,
        cantidad: true,
        tipo: true,
        equipo: {
          select: {
            marca: true,
            modelo: true,
            descripcion: true,
            categoria: { select: { nombre: true, disciplina: true } },
          },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.proveedorEvento.findMany({
      where: { proyectoId },
      select: {
        id: true,
        nombreProveedor: true,
        servicioEquipo: true,
        responsable: true,
        telefonoProveedor: true,
      },
      orderBy: { nombreProveedor: "asc" },
    }),
    prisma.proyectoBloqueTiempo.findMany({
      where: { proyectoId },
      select: { id: true, titulo: true, tipo: true, horaInicio: true, horaFin: true, orden: true, fecha: true },
      orderBy: [{ fecha: "asc" }, { orden: "asc" }],
    }),
  ]);

  const responsables: ContextoSitePlan["responsables"] = personal.map(p => ({
    id: p.id,
    nombre: p.tecnico?.nombre ?? "Puesto sin asignar",
    detalle:
      [p.rolTecnico?.nombre ?? p.rolEnEvento, p.coordinaEnSitio ? "coordina en sitio" : null]
        .filter(Boolean)
        .join(" · ") || p.responsabilidad,
    contacto: p.tecnico?.celular ?? null,
  }));
  if (proyecto.encargadoCliente) {
    responsables.push({
      id: "cliente",
      nombre: proyecto.encargadoCliente,
      detalle: "Encargado del cliente",
      contacto: proyecto.encargadoClienteContacto,
    });
  }

  return {
    responsables,
    proveedores: proveedores.map(p => ({
      id: p.id,
      nombre: p.nombreProveedor,
      detalle: p.servicioEquipo ?? p.responsable,
      contacto: p.telefonoProveedor,
    })),
    rider: equipos.map(e => ({
      id: e.id,
      concepto: [e.equipo.marca, e.equipo.modelo].filter(Boolean).join(" ") || e.equipo.descripcion || "Equipo",
      detalle:
        [e.equipo.categoria?.disciplina, e.equipo.categoria?.nombre, e.tipo === "EXTERNO" ? "de tercero" : null]
          .filter(Boolean)
          .join(" · ") || null,
      cantidad: e.cantidad,
    })),
    ventanas: bloques.map(b => ({
      id: b.id,
      titulo: b.titulo,
      tipo: b.tipo,
      inicio: b.horaInicio,
      fin: b.horaFin,
    })),
    venue: proyecto.venue ?? venueDirecto,
    // El proyecto no lleva aforo propio: el del sitio se captura en el cuadro de
    // datos del plano, que es donde además conviven aforo y evacuación.
    aforoEsperado: null,
  };
}
