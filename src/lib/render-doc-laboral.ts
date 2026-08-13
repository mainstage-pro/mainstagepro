import ReactPDF from "@react-pdf/renderer";
import React from "react";
import { OfertaTrabajoPDF } from "@/components/OfertaTrabajoPDF";
import { AcuerdoLaboralPDF } from "@/components/AcuerdoLaboralPDF";
import { ConvenioTecnicoPDF } from "@/components/ConvenioTecnicoPDF";
import type { DocLaboralSnapshot } from "@/lib/documentos-laborales";

export async function renderDocLaboralPdf(snapshot: DocLaboralSnapshot): Promise<Buffer> {
  const Comp = snapshot.tipo === "OFERTA" ? OfertaTrabajoPDF
    : snapshot.tipo === "CONVENIO_TECNICO" ? ConvenioTecnicoPDF
    : AcuerdoLaboralPDF;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await ReactPDF.renderToStream(React.createElement(Comp, snapshot) as any);
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    (stream as NodeJS.ReadableStream).on("data", (c) => chunks.push(Buffer.from(c)));
    (stream as NodeJS.ReadableStream).on("end", resolve);
    (stream as NodeJS.ReadableStream).on("error", reject);
  });
  return Buffer.concat(chunks);
}
