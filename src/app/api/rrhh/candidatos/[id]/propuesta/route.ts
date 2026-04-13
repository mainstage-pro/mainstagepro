import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF from "@react-pdf/renderer";
import { PropuestaTrabajoPDF } from "@/components/PropuestaTrabajoPDF";
import React from "react";

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const postulacionId = req.nextUrl.searchParams.get("postulacionId");

  const candidato = await prisma.candidato.findUnique({
    where: { id },
    include: {
      postulaciones: {
        where: postulacionId ? { id: postulacionId } : undefined,
        include: { puesto: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!candidato) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const post = candidato.postulaciones[0];
  const puesto = post?.puesto;

  // Parse beneficios
  let beneficios: string[] = [];
  try { beneficios = JSON.parse(post?.beneficios ?? "[]"); } catch { beneficios = []; }

  const props = {
    candidatoNombre:   candidato.nombre,
    candidatoCorreo:   candidato.correo,
    candidatoTelefono: candidato.telefono,
    candidatoCiudad:   candidato.ciudad,
    candidatoCarrera:  candidato.carrera,
    puestoTitulo:      puesto?.titulo ?? post?.puestoManual ?? "Colaborador",
    puestoArea:        puesto?.area ?? post?.areaManual ?? "",
    puestoDescripcion: puesto?.descripcion,
    puestoObjetivo:    puesto?.objetivoRol,
    salarioPropuesto:  post?.salarioPropuesto ?? null,
    salarioMin:        puesto?.salarioMin ?? null,
    salarioMax:        puesto?.salarioMax ?? null,
    tipoContrato:      puesto?.tipoContrato ?? null,
    modalidad:         puesto?.modalidad ?? null,
    horario:           puesto?.horario ?? null,
    fechaIngreso:      post?.fechaIngresoEstimada ? fmtDate(new Date(post.fechaIngresoEstimada)) : null,
    beneficios,
    observaciones:     post?.observaciones ?? null,
    responsableNombre: session.name ?? "Director de Producción",
    fechaDocumento:    fmtDate(new Date()),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await ReactPDF.renderToStream(React.createElement(PropuestaTrabajoPDF, props) as any);
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    (stream as NodeJS.ReadableStream).on("data", c => chunks.push(Buffer.from(c)));
    (stream as NodeJS.ReadableStream).on("end", resolve);
    (stream as NodeJS.ReadableStream).on("error", reject);
  });

  // Mark propuesta as sent if not yet
  if (post && !post.propuestaFechaEnvio) {
    await prisma.postulacion.update({
      where: { id: post.id },
      data: { propuestaFechaEnvio: new Date(), etapa: "PROPUESTA_ENVIADA", updatedAt: new Date() },
    });
  }

  const nombre = candidato.nombre.replace(/\s+/g, "-");
  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Propuesta-${nombre}.pdf"`,
    },
  });
}
