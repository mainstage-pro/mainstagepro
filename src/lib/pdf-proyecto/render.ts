// src/lib/pdf-proyecto/render.ts
//
// Los documentos del proyecto se generan desde dos puertas: el endpoint interno
// con sesión (descarga) y el enlace público por token (visor en línea). Ambas
// llaman a los mismos generadores de esta carpeta, así que el PDF es idéntico
// byte por byte y no hay un segundo diseño que mantener.

import { NextResponse } from "next/server";
import ReactPDF, { Document } from "@react-pdf/renderer";

export interface PdfProyecto {
  buf: Buffer;
  filename: string;
}

export async function bufferDePdf(
  elemento: React.ReactElement<React.ComponentProps<typeof Document>>
): Promise<Buffer> {
  const stream = await ReactPDF.renderToStream(elemento);
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export function respuestaPdf(pdf: PdfProyecto, inline: boolean): NextResponse {
  return new NextResponse(pdf.buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${pdf.filename}"`,
      "Content-Length": String(pdf.buf.length),
      "Cache-Control": "no-store",
    },
  });
}
