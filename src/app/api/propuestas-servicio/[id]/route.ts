import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ESTADOS_PROPUESTA, MODELOS_COBRO } from "@/lib/giras";
import { recalcularPropuesta, textoOpcional, numero, booleano, fecha, soloDefinidos } from "../recalcular";

const INCLUDE_DETALLE = {
  cliente: { select: { id: true, nombre: true, empresa: true } },
  artista: { select: { id: true, nombre: true, logoUrl: true } },
  gira: {
    select: {
      id: true,
      nombre: true,
      estado: true,
      fechaInicio: true,
      fechaFin: true,
      shows: {
        select: {
          id: true,
          fecha: true,
          ciudad: true,
          estado: true,
          venueId: true,
          venue: { select: { id: true, nombre: true } },
        },
        orderBy: { fecha: "asc" as const },
      },
    },
  },
  lineas: {
    include: {
      servicio: { select: { id: true, clave: true, nombre: true } },
      equipo: { select: { id: true, descripcion: true, marca: true, modelo: true } },
      rolTecnico: { select: { id: true, nombre: true } },
      show: { select: { id: true, fecha: true, ciudad: true } },
    },
    orderBy: [{ orden: "asc" as const }, { createdAt: "asc" as const }],
  },
};

// GET: la propuesta completa con sus líneas
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const propuesta = await prisma.propuestaServicio.findUnique({ where: { id }, include: INCLUDE_DETALLE });
  if (!propuesta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  return NextResponse.json({ propuesta });
}

// PATCH: edita la cabecera. Nunca toca las líneas — eso va por su propio endpoint.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const existente = await prisma.propuestaServicio.findUnique({ where: { id }, select: { id: true, numero: true } });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  const estado = textoOpcional(body.estado);
  if (estado && !ESTADOS_PROPUESTA.includes(estado as (typeof ESTADOS_PROPUESTA)[number])) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }
  const modeloCobro = textoOpcional(body.modeloCobro);
  if (modeloCobro && !MODELOS_COBRO.includes(modeloCobro as (typeof MODELOS_COBRO)[number])) {
    return NextResponse.json({ error: "Modelo de cobro inválido" }, { status: 400 });
  }

  const data = soloDefinidos({
    titulo: textoOpcional(body.titulo),
    estado: estado ?? undefined,
    modeloCobro: modeloCobro ?? undefined,
    moneda: textoOpcional(body.moneda) ?? undefined,
    vigenciaHasta: fecha(body.vigenciaHasta),
    clienteId: textoOpcional(body.clienteId),
    artistaId: textoOpcional(body.artistaId),
    giraId: textoOpcional(body.giraId),
    tratoId: textoOpcional(body.tratoId),
    alcance: textoOpcional(body.alcance),
    exclusiones: textoOpcional(body.exclusiones),
    supuestos: textoOpcional(body.supuestos),
    condicionesPago: textoOpcional(body.condicionesPago),
    notasInternas: textoOpcional(body.notasInternas),
    aplicaIva: booleano(body.aplicaIva),
    descuentoMonto: numero(body.descuentoMonto),
    descuentoRazon: textoOpcional(body.descuentoRazon),
    activo: booleano(body.activo),
  });

  await prisma.propuestaServicio.update({ where: { id }, data });

  // Descuento e IVA mueven los totales, así que siempre se resella la cabecera.
  const resumen = await recalcularPropuesta(id);

  await logActividad(
    session.id,
    "EDITAR",
    "propuesta_servicio",
    id,
    `Propuesta ${existente.numero} actualizada`,
  );

  const propuesta = await prisma.propuestaServicio.findUnique({ where: { id }, include: INCLUDE_DETALLE });
  return NextResponse.json({ propuesta, resumen });
}

// DELETE: baja lógica
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const propuesta = await prisma.propuestaServicio.findUnique({ where: { id }, select: { numero: true } });
  if (!propuesta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.propuestaServicio.update({ where: { id }, data: { activo: false } });
  await logActividad(session.id, "ELIMINAR", "propuesta_servicio", id, `Propuesta ${propuesta.numero} archivada`);

  return NextResponse.json({ ok: true });
}
