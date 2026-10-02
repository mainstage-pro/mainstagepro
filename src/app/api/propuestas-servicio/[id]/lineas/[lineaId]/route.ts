import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { TIPOS_LINEA_PROPUESTA, UNIDADES_COBRO } from "@/lib/giras";
import { subtotalLinea } from "@/lib/propuesta-servicio";
import { recalcularPropuesta, textoOpcional, numero, booleano, soloDefinidos } from "../../../recalcular";

const INCLUDE_LINEA = {
  servicio: { select: { id: true, clave: true, nombre: true } },
  equipo: { select: { id: true, descripcion: true, marca: true, modelo: true } },
  rolTecnico: { select: { id: true, nombre: true } },
  show: { select: { id: true, fecha: true, ciudad: true } },
};

// PATCH: edita una línea en su lugar. Nunca se recrean las líneas de una
// propuesta: un PUT que borraba y volvía a insertar ya rompió referencias en
// otro módulo y costó reparar datos en producción.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; lineaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, lineaId } = await params;
  const actual = await prisma.propuestaServicioLinea.findUnique({ where: { id: lineaId } });
  if (!actual || actual.propuestaId !== id) {
    return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  const tipo = textoOpcional(body.tipo);
  if (tipo && !TIPOS_LINEA_PROPUESTA.includes(tipo as (typeof TIPOS_LINEA_PROPUESTA)[number])) {
    return NextResponse.json({ error: "Tipo de línea inválido" }, { status: 400 });
  }
  const unidad = textoOpcional(body.unidad);
  if (unidad && !UNIDADES_COBRO.includes(unidad as (typeof UNIDADES_COBRO)[number])) {
    return NextResponse.json({ error: "Unidad inválida" }, { status: 400 });
  }

  const conceptoNuevo = textoOpcional(body.concepto);
  if (body.concepto !== undefined && !conceptoNuevo) {
    return NextResponse.json({ error: "El concepto no puede quedar vacío" }, { status: 400 });
  }

  const cambios = soloDefinidos({
    tipo: tipo ?? undefined,
    unidad: unidad ?? undefined,
    concepto: conceptoNuevo ?? undefined,
    descripcion: textoOpcional(body.descripcion),
    cantidad: numero(body.cantidad),
    precioUnitario: numero(body.precioUnitario),
    costoUnitario: numero(body.costoUnitario),
    esIncluido: booleano(body.esIncluido),
    esReembolsable: booleano(body.esReembolsable),
    servicioId: textoOpcional(body.servicioId),
    equipoId: textoOpcional(body.equipoId),
    rolTecnicoId: textoOpcional(body.rolTecnicoId),
    showId: textoOpcional(body.showId),
    notas: textoOpcional(body.notas),
    orden: numero(body.orden),
  });

  const fusionada = { ...actual, ...cambios };

  const linea = await prisma.propuestaServicioLinea.update({
    where: { id: lineaId },
    data: { ...cambios, subtotal: subtotalLinea(fusionada) },
    include: INCLUDE_LINEA,
  });

  const resumen = await recalcularPropuesta(id);
  return NextResponse.json({ linea, resumen });
}

// DELETE: quita la línea
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; lineaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, lineaId } = await params;
  const linea = await prisma.propuestaServicioLinea.findUnique({
    where: { id: lineaId },
    select: { propuestaId: true },
  });
  if (!linea || linea.propuestaId !== id) {
    return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });
  }

  await prisma.propuestaServicioLinea.delete({ where: { id: lineaId } });
  const resumen = await recalcularPropuesta(id);

  return NextResponse.json({ ok: true, resumen });
}
