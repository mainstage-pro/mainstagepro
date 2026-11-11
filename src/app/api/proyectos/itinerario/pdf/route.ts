import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import React from "react";
import { ItinerarioOperacionesPDF } from "@/components/ItinerarioOperacionesPDF";
import { proyectosEnRango } from "@/app/api/proyectos/itinerario/route";
import { actividadesEnRango } from "@/lib/itinerario-actividades";
import { eventoDeSueltas } from "@/lib/itinerario-operaciones";

function parseFecha(v: string | null, fallbackDaysFromNow: number): string {
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date();
  d.setDate(d.getDate() + fallbackDaysFromNow);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const inicio = parseFecha(searchParams.get("inicio"), 0);
  const fin = parseFecha(searchParams.get("fin"), 30);

  const [proyectos, sueltas] = await Promise.all([proyectosEnRango(inicio, fin), actividadesEnRango(inicio, fin).catch((e) => {
      // Las sueltas nunca deben tumbar el itinerario de los proyectos.
      console.error("[itinerario] actividades sueltas", e);
      return [];
    }),
  ]);
  const grupoSueltas = eventoDeSueltas(sueltas);
  const eventos = grupoSueltas ? [...proyectos, grupoSueltas] : proyectos;

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(ItinerarioOperacionesPDF, { data: { eventos, inicio, fin } }) as React.ReactElement<
      React.ComponentProps<typeof Document>
    >,
  );
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Itinerario-Operaciones-${inicio}-a-${fin}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
