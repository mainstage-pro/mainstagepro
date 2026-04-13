import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { postulacionId } = await req.json();

  const candidato = await prisma.candidato.findUnique({ where: { id } });
  if (!candidato) return NextResponse.json({ error: "Candidato no encontrado" }, { status: 404 });

  const postulacion = await prisma.postulacion.findUnique({
    where: { id: postulacionId },
    include: { puesto: true },
  });
  if (!postulacion) return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });

  const puesto = postulacion.puesto?.titulo ?? postulacion.puestoManual ?? "Colaborador";
  const departamento = postulacion.puesto?.area ?? postulacion.areaManual ?? "GENERAL";

  // Create PersonalInterno
  const personal = await prisma.personalInterno.create({
    data: {
      nombre:       candidato.nombre,
      puesto,
      departamento: departamento.toUpperCase(),
      tipo:         "EMPLEADO",
      telefono:     candidato.telefono || null,
      correo:       candidato.correo || null,
      salario:      postulacion.salarioPropuesto || null,
      periodoPago:  "MENSUAL",
      fechaIngreso: postulacion.fechaIngresoEstimada || new Date(),
      activo:       true,
    },
  });

  // Update postulacion → CONTRATADO + link personalInternoId
  await prisma.postulacion.update({
    where: { id: postulacionId },
    data: {
      etapa:             "CONTRATADO",
      personalInternoId: personal.id,
      contratoGenerado:  true,
      contratoFecha:     new Date(),
      updatedAt:         new Date(),
    },
  });

  return NextResponse.json({ personal, ok: true });
}
