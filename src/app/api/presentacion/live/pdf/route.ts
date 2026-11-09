import { NextResponse } from "next/server";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { PresentacionLivePDF } from "@/components/pdf/PresentacionLivePDF";
import React from "react";
import fs from "fs";
import path from "path";
import sharp from "sharp";

/** Fotos fuente son de varios MB; se recomprimen a JPEG ligero del tamaño
 * de página antes de incrustarlas en base64, o el PDF pesaría decenas de MB. */
async function fotoComprimida(rel: string): Promise<string | null> {
  const full = path.join(process.cwd(), "public", rel);
  if (!fs.existsSync(full)) return null;
  const buf = await sharp(full).resize(1280, 720, { fit: "cover" }).jpeg({ quality: 68 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

export async function GET() {
  const logoPath = path.join(process.cwd(), "public", "logo-live.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const [portadaSrc, cierreSrc] = await Promise.all([
    fotoComprimida("images/presentacion/musicales/Musicales-140.jpg"),
    fotoComprimida("images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg"),
  ]);

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(PresentacionLivePDF, { logoSrc, portadaSrc, cierreSrc }) as React.ReactElement<
      React.ComponentProps<typeof Document>
    >
  );

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Mainstage Live - Presentacion de servicios.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
