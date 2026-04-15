import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: get proposal data for public acceptance page (no auth required)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const post = await prisma.postulacion.findUnique({
    where: { propuestaToken: token },
    include: {
      candidato: { select: { id: true, nombre: true, correo: true } },
      puesto: { select: { titulo: true, area: true, descripcion: true, modalidad: true, tipoContrato: true, horario: true } },
    },
  });

  if (!post) return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 });

  let beneficios: string[] = [];
  try { beneficios = JSON.parse(post.beneficios ?? "[]"); } catch { beneficios = []; }

  return NextResponse.json({
    candidatoNombre: post.candidato.nombre,
    puestoTitulo: post.puesto?.titulo ?? post.puestoManual ?? "Colaborador",
    puestoArea: post.puesto?.area ?? post.areaManual ?? "",
    puestoDescripcion: post.puesto?.descripcion ?? null,
    modalidad: post.puesto?.modalidad ?? null,
    tipoContrato: post.puesto?.tipoContrato ?? null,
    horario: post.puesto?.horario ?? null,
    salarioPropuesto: post.salarioPropuesto ?? null,
    fechaIngresoEstimada: post.fechaIngresoEstimada ?? null,
    beneficios,
    observaciones: post.observaciones ?? null,
    propuestaAceptada: post.propuestaAceptada,
    etapa: post.etapa,
  });
}

// POST: candidate accepts or rejects proposal
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();
  const { acepta } = body; // true = aceptar, false = rechazar

  const post = await prisma.postulacion.findUnique({
    where: { propuestaToken: token },
  });

  if (!post) return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 });

  // Allow re-confirmation only if not yet decided
  if (post.propuestaAceptada !== null && post.propuestaAceptada !== undefined) {
    return NextResponse.json({ error: "Esta propuesta ya fue respondida", propuestaAceptada: post.propuestaAceptada }, { status: 409 });
  }

  const nuevaEtapa = acepta ? "APROBADO" : "RECHAZADO";

  await prisma.postulacion.update({
    where: { id: post.id },
    data: {
      propuestaAceptada: acepta,
      etapa: nuevaEtapa,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, acepta });
}
