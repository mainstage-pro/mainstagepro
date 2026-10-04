import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { contarGira, cantidadSugerida, subtotalLinea } from "@/lib/propuesta-servicio";
import { recalcularPropuesta } from "../../recalcular";

/// Las líneas típicas de una gira de production management, en orden de lectura.
/// `veces` dice de dónde sale la cantidad; el precio sale del catálogo, así que
/// cambiar la tarifa en /giras/servicios cambia lo que arma este botón.
const PLANTILLA_GIRA: { clave: string; veces: "SHOWS" | "VENUES" | "CIUDADES" | "UNA" | "UNIDAD" }[] = [
  { clave: "DOCUMENTACION_TOUR", veces: "UNA" },
  { clave: "ADVANCE_PLAZA", veces: "VENUES" },
  { clave: "COORD_PROVEEDORES", veces: "VENUES" },
  { clave: "AUDIO_BANDA", veces: "SHOWS" },
  { clave: "DIA_VIAJE", veces: "CIUDADES" },
];

/// Lo típico de un evento de un solo sitio. Más corto que la gira a propósito:
/// aquí no hay plazas ni días de viaje, y los renders y el plano se agregan
/// desde el catálogo cuando el evento los pide.
const PLANTILLA_EVENTO: { clave: string; veces: "UNA" | "DIAS" }[] = [
  { clave: "PM_EVENTO", veces: "UNA" },
  { clave: "COORD_FRENTES", veces: "UNA" },
  { clave: "OPERACIONES_SITIO", veces: "DIAS" },
  { clave: "STAGE_MANAGER", veces: "DIAS" },
  { clave: "RENDER_PRODUCCION", veces: "UNA" },
];

/// Gastos de viaje: van a costo, en su propio subtotal, para que no se coman el
/// honorario. Nacen en cero porque el monto real sale de cotizar vuelos y hotel.
/// Solo aplican a gira: un evento local no mueve a nadie en avión.
const REEMBOLSABLES: { tipo: string; concepto: string; descripcion: string; unidad: string; veces: "CIUDADES" | "SHOWS" }[] = [
  {
    tipo: "VIAJE",
    concepto: "Vuelos y traslados",
    descripcion: "Vuelos y traslados tierra del responsable de Mainstage. Se factura a costo comprobable.",
    unidad: "GLOBAL",
    veces: "CIUDADES",
  },
  {
    tipo: "HOSPEDAJE",
    concepto: "Hospedaje",
    descripcion: "Noches de hotel en cada show. Habitación sencilla, a costo comprobable.",
    unidad: "DIA",
    veces: "SHOWS",
  },
  {
    tipo: "VIATICO",
    concepto: "Per diem",
    descripcion: "Alimentos y gastos menores por día de gira.",
    unidad: "PERSONA_DIA",
    veces: "SHOWS",
  },
];

// POST: siembra las líneas típicas del registro ligado, ya cuantificadas.
// Todo queda editable después: esto es un punto de partida, no un candado.
//
// Hay dos caminos porque hay dos negocios: la gira cuantifica por fechas y
// plazas, el evento por días en sitio. La gira gana si están ligadas las dos.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const propuesta = await prisma.propuestaServicio.findUnique({
    where: { id },
    select: {
      id: true,
      numero: true,
      giraId: true,
      gira: {
        select: {
          nombre: true,
          shows: { select: { id: true, venueId: true, ciudad: true, estado: true }, orderBy: { fecha: "asc" } },
        },
      },
      tratoId: true,
      trato: { select: { nombreEvento: true, diasServicio: true, cliente: { select: { nombre: true } } } },
      lineas: { select: { concepto: true, servicio: { select: { clave: true } } } },
    },
  });
  if (!propuesta) return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 });

  const esGira = Boolean(propuesta.giraId && propuesta.gira);
  if (!esGira && !propuesta.trato) {
    return NextResponse.json(
      { error: "Liga un trato de evento o una gira antes de armar la propuesta" },
      { status: 400 },
    );
  }

  // Un evento sin días declarados se arma como un día: es lo más común y el
  // renglón queda editable. Una gira sin fechas no se puede cuantificar.
  const conteo = esGira ? contarGira(propuesta.gira!.shows) : { shows: 0, venues: 0, ciudades: 0 };
  const dias = Math.max(1, propuesta.trato?.diasServicio ?? 1);
  if (esGira && conteo.shows === 0) {
    return NextResponse.json({ error: "La gira todavía no tiene fechas" }, { status: 400 });
  }

  const plantilla: { clave: string; veces: string }[] = esGira ? PLANTILLA_GIRA : PLANTILLA_EVENTO;

  const clavesPuestas = new Set(propuesta.lineas.map((l) => l.servicio?.clave).filter(Boolean) as string[]);
  const conceptosPuestos = new Set(propuesta.lineas.map((l) => l.concepto.toLowerCase()));

  const servicios = await prisma.servicioPM.findMany({
    where: { clave: { in: plantilla.map((p) => p.clave) } },
  });
  const porClave = new Map(servicios.map((s) => [s.clave, s]));

  const faltanEnCatalogo = plantilla.filter((p) => !porClave.has(p.clave)).map((p) => p.clave);

  let orden = propuesta.lineas.length * 10;
  const nuevas: Prisma.PropuestaServicioLineaUncheckedCreateInput[] = [];

  for (const item of plantilla) {
    const servicio = porClave.get(item.clave);
    if (!servicio || clavesPuestas.has(item.clave)) continue;

    const cantidad =
      item.veces === "SHOWS"
        ? conteo.shows
        : item.veces === "VENUES"
          ? conteo.venues
          : item.veces === "CIUDADES"
            ? Math.max(1, conteo.ciudades)
            : item.veces === "DIAS"
              ? dias
              : item.veces === "UNA"
                ? 1
                : cantidadSugerida(servicio.unidadDefault, conteo);

    orden += 10;
    const datos = {
      propuestaId: id,
      servicioId: servicio.id,
      tipo: servicio.tipoLinea,
      unidad: servicio.unidadDefault,
      concepto: servicio.nombre,
      descripcion: servicio.descripcion,
      cantidad,
      precioUnitario: servicio.precioSugerido ?? 0,
      costoUnitario: servicio.costoSugerido ?? 0,
      esIncluido: false,
      esReembolsable: false,
      orden,
    };
    nuevas.push({ ...datos, subtotal: subtotalLinea(datos) });
  }

  if (esGira) {
    for (const r of REEMBOLSABLES) {
      if (conceptosPuestos.has(r.concepto.toLowerCase())) continue;
      orden += 10;
      const datos = {
        propuestaId: id,
        tipo: r.tipo,
        unidad: r.unidad,
        concepto: r.concepto,
        descripcion: r.descripcion,
        cantidad: r.veces === "SHOWS" ? conteo.shows : Math.max(1, conteo.ciudades),
        precioUnitario: 0,
        costoUnitario: 0,
        esIncluido: false,
        esReembolsable: true,
        orden,
      };
      nuevas.push({ ...datos, subtotal: subtotalLinea(datos) });
    }
  }

  if (nuevas.length) {
    await prisma.$transaction(nuevas.map((data) => prisma.propuestaServicioLinea.create({ data })));
  }

  const resumen = await recalcularPropuesta(id);

  const origen = esGira
    ? `la gira ${propuesta.gira!.nombre}`
    : `el trato de ${propuesta.trato!.nombreEvento || propuesta.trato!.cliente.nombre}`;
  const detalle = esGira
    ? `${conteo.shows} shows en ${conteo.venues} venues`
    : `${dias} ${dias === 1 ? "día" : "días"} de servicio`;

  await logActividad(
    session.id,
    "EDITAR",
    "propuesta_servicio",
    id,
    `Propuesta ${propuesta.numero} armada desde ${origen} (${nuevas.length} líneas)`,
  );

  return NextResponse.json({
    ok: true,
    agregadas: nuevas.length,
    detalle,
    conteo,
    faltanEnCatalogo,
    resumen,
  });
}
