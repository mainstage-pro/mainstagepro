// src/lib/pdf-proyecto/render.ts
//
// Los documentos del proyecto se generan desde dos puertas: el endpoint interno
// con sesión (descarga) y el enlace público por token (visor en línea). Ambas
// llaman a los mismos generadores de esta carpeta, así que el PDF es idéntico
// byte por byte y no hay un segundo diseño que mantener.

import { NextResponse } from "next/server";
import React from "react";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { limpiarTextosPdf } from "@/lib/pdf-texto";

export interface PdfProyecto {
  buf: Buffer;
  filename: string;
}

export async function bufferDePdf(
  elemento: React.ReactElement<React.ComponentProps<typeof Document>>
): Promise<Buffer> {
  // Último punto común antes de dibujar: aquí se quitan los caracteres que la
  // Helvetica del PDF no imprime. Se hace sobre las props del componente raíz
  // porque todos los generadores de gira y proyecto le pasan ahí su objeto de
  // datos, y así ningún campo nuevo se escapa (ver src/lib/pdf-texto.ts).
  const limpio = React.cloneElement(elemento, limpiarTextosPdf(elemento.props));
  const stream = await ReactPDF.renderToStream(limpio);
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
