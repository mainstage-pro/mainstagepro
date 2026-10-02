import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { TIPOS_LINEA_PROPUESTA, UNIDADES_COBRO } from "@/lib/giras";
import { subtotalLinea } from "@/lib/propuesta-servicio";
import { recalcularPropuesta, textoOpcional, numero, booleano } from "../../recalcular";

const INCLUDE_LINEA = {
  servicio: { select: { id: true, clave: true, nombre: true } },
  equipo: { select: { id: true, descripcion: true, marca: true, modelo: true } },
  rolTecnico: { select: { id: true, nombre: true } },
  show: { select: { id: true, fecha: true, ciudad: true } },
};

// POST: agrega una línea, desde el catálogo de ServicioPM o libre
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const propuesta = await prisma.propuestaServicio.findUnique({
    where: { id },
    select: { id: true, _count: { select: { lineas: true } } },
  });
  if (!propuesta) return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const servicioId = textoOpcional(body.servicioId) ?? null;

  // El servicio del catálogo precarga los defaults; lo que venga en el cuerpo
  // los pisa, porque la línea se tiene que poder ajustar al cerrar el trato.
  let base = { concepto: "", descripcion: null as string | null, unidad: "SHOW", tipo: "HONORARIO", precio: 0, costo: 0 };
  if (servicioId) {
    const servicio = await prisma.servicioPM.findUnique({ where: { id: servicioId } });
    if (!servicio) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    base = {
      concepto: servicio.nombre,
      descripcion: servicio.descripcion,
      unidad: servicio.unidadDefault,
      tipo: servicio.tipoLinea,
      precio: servicio.precioSugerido ?? 0,
      costo: servicio.costoSugerido ?? 0,
    };
  }

  const concepto = textoOpcional(body.concepto) ?? base.concepto;
  if (!concepto) return NextResponse.json({ error: "El concepto es obligatorio" }, { status: 400 });

  const tipo = textoOpcional(body.tipo) ?? base.tipo;
  if (!TIPOS_LINEA_PROPUESTA.includes(tipo as (typeof TIPOS_LINEA_PROPUESTA)[number])) {
    return NextResponse.json({ error: "Tipo de línea inválido" }, { status: 400 });
  }
  const unidad = textoOpcional(body.unidad) ?? base.unidad;
  if (!UNIDADES_COBRO.includes(unidad as (typeof UNIDADES_COBRO)[number])) {
    return NextResponse.json({ error: "Unidad inválida" }, { status: 400 });
  }

  const datos = {
    propuestaId: id,
    servicioId,
    tipo,
    unidad,
    concepto,
    descripcion: textoOpcional(body.descripcion) ?? base.descripcion,
    cantidad: numero(body.cantidad) ?? 1,
    precioUnitario: numero(body.precioUnitario) ?? base.precio,
    costoUnitario: numero(body.costoUnitario) ?? base.costo,
    esIncluido: booleano(body.esIncluido) ?? false,
    esReembolsable: booleano(body.esReembolsable) ?? false,
    equipoId: textoOpcional(body.equipoId) ?? null,
    rolTecnicoId: textoOpcional(body.rolTecnicoId) ?? null,
    showId: textoOpcional(body.showId) ?? null,
    notas: textoOpcional(body.notas) ?? null,
    orden: numero(body.orden) ?? (propuesta._count.lineas + 1) * 10,
  };

  const linea = await prisma.propuestaServicioLinea.create({
    data: { ...datos, subtotal: subtotalLinea(datos) },
    include: INCLUDE_LINEA,
  });

  const resumen = await recalcularPropuesta(id);
  return NextResponse.json({ linea, resumen });
}
