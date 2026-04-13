import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF from "@react-pdf/renderer";
import { CartaFreelancePDF, PuestoCategoria } from "@/components/CartaFreelancePDF";
import React from "react";

// Mapeo de nombre de rol → categoría de puesto para checkboxes y clausula 1
function detectarCategoria(rol: string | null | undefined): PuestoCategoria {
  if (!rol) return "OTRO";
  const r = rol.toLowerCase();

  if (/audio|sonido|foh|monitor|a1|a2|pa|sound|mixer|mix|iem|rf|técnico de audio|operador de audio/.test(r)) return "AUDIO";
  if (/iluminaci|luces|lighting|ld|luz|fixture|grandma|ma2|ma3|avolite|vista|operador de luz/.test(r))       return "ILUMINACION";
  if (/video|led|pantalla|vj|vmix|resolume|playback|streaming|broadcast|switcher|señal/.test(r))             return "VIDEO_LED";
  if (/rigging|rigger|aéreo|aereo|motor|chain|truss/.test(r))                                                return "RIGGING";
  if (/stage|escenario|backline|stagehand|stage hand|utilero|runner de escenario/.test(r))                   return "STAGE";
  if (/runner|asistente|apoyo|mensajero|logística/.test(r))                                                   return "RUNNER";
  if (/dj|disc jockey|disk jockey/.test(r))                                                                   return "DJ";
  if (/production manager|pm\b|coordinador|coord|director de producción|jefe de producción|producción/.test(r)) return "PM";
  if (/energ|electrici|eléctric|electric|power|planta|generador|técnico eléctrico/.test(r))                  return "ENERGIA";

  return "OTRO";
}

function fmtDateLong(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

function extraerCiudad(lugar: string | null | undefined): string {
  if (!lugar) return "Querétaro, Qro.";
  const parts = lugar.split(",");
  if (parts.length > 1) return parts[parts.length - 1].trim();
  return lugar;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; personalId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, personalId } = await params;

  const pp = await prisma.proyectoPersonal.findUnique({
    where: { id: personalId },
    include: {
      tecnico:   { select: { nombre: true, celular: true } },
      rolTecnico: { select: { nombre: true } },
      proyecto: {
        select: {
          id: true,
          numeroProyecto: true,
          nombre: true,
          fechaEvento: true,
          lugarEvento: true,
          encargado: { select: { name: true } },
        },
      },
    },
  });

  if (!pp || pp.proyectoId !== id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const proy = pp.proyecto;
  const rolNombre = pp.rolTecnico?.nombre ?? "Técnico";
  const categoria = detectarCategoria(rolNombre);
  const ciudad = extraerCiudad(proy.lugarEvento);

  const props = {
    tecnicoNombre:     pp.tecnico?.nombre ?? "Técnico Freelance",
    tecnicoCelular:    pp.tecnico?.celular ?? null,
    rolNombre,
    categoria,
    numeroProyecto:    proy.numeroProyecto,
    nombreEvento:      proy.nombre,
    fechaEvento:       fmtDateLong(new Date(proy.fechaEvento)),
    lugarEvento:       proy.lugarEvento,
    ciudad,
    responsableNombre: proy.encargado?.name ?? "Responsable Mainstage Pro",
    responsableCargo:  req.nextUrl.searchParams.get("cargo") ?? "Director de Producción",
    participacion:     pp.participacion,
    jornada:           pp.jornada,
    responsabilidad:   pp.responsabilidad,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await ReactPDF.renderToStream(React.createElement(CartaFreelancePDF, props) as any);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    (stream as NodeJS.ReadableStream).on("data", (c) => chunks.push(Buffer.from(c)));
    (stream as NodeJS.ReadableStream).on("end", resolve);
    (stream as NodeJS.ReadableStream).on("error", reject);
  });

  const pdf = Buffer.concat(chunks);
  const nombre = (pp.tecnico?.nombre ?? "freelance").replace(/\s+/g, "-");
  const filename = `Carta-Freelance-${proy.numeroProyecto}-${nombre}.pdf`;

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
