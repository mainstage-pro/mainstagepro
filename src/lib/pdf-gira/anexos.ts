// src/lib/pdf-gira/anexos.ts
//
// Los stage plots y planos que cuelgan de un rider. Llegan en dos formas y cada
// una se imprime distinto:
//
//   · Imagen → se dibuja en su propia página del rider. Hay que conocer su
//     proporción antes de maquetar: un plano apaisado estirado a un marco vertical
//     deja el escenario deformado y la casa monta con medidas equivocadas.
//   · PDF    → se pega al final del documento con sus páginas intactas. react-pdf
//     no sabe embeber otro PDF, así que la unión la hace pdf-lib sobre el buffer
//     ya renderizado.
//
// `resolvePdfImage` de PdfShared no sirve aquí: reescala a 240 px porque está
// pensado para miniaturas de catálogo. Un plano a 240 px es ilegible.

import { PDFDocument } from "pdf-lib";

/// Lado largo al que se reescala el anexo. A 1800 px un stage plot carta se
/// imprime nítido y el PDF no se va a decenas de MB.
const LADO_MAX = 1800;

export interface ImagenAnexo {
  dataUri: string;
  /// Proporción ancho/alto. Es lo que necesita el maquetado para encajar la
  /// imagen en el marco sin deformarla.
  proporcion: number;
}

async function descargar(src: string, publicDir: string): Promise<{ bytes: Buffer; mime: string } | null> {
  try {
    if (src.startsWith("http://") || src.startsWith("https://")) {
      const res = await fetch(src);
      if (!res.ok) return null;
      return {
        bytes: Buffer.from(await res.arrayBuffer()),
        mime: res.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream",
      };
    }
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(publicDir, src.replace(/^\//, ""));
    if (!fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath).slice(1).toLowerCase();
    return {
      bytes: fs.readFileSync(filePath),
      mime: ext === "pdf" ? "application/pdf" : ext === "jpg" ? "image/jpeg" : `image/${ext}`,
    };
  } catch {
    return null;
  }
}

/// Deja la imagen lista para `<Image>` de react-pdf y dice qué proporción tiene.
/// Sin sharp se devuelven los bytes tal cual con proporción carta: el documento
/// sale, solo pesa más y el marco puede sobrarle aire.
export async function resolverImagenAnexo(src: string, publicDir: string): Promise<ImagenAnexo | null> {
  const archivo = await descargar(src, publicDir);
  if (!archivo) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sharp = (await import("sharp")).default as any;
    const pipeline = sharp(archivo.bytes).rotate();
    const meta = await pipeline.metadata();
    const png = await pipeline
      .resize(LADO_MAX, LADO_MAX, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();

    // `rotate()` ya aplicó el EXIF, pero la metadata viene del original: en una
    // foto de celular en vertical el ancho y el alto llegan cambiados.
    const giradaEnExif = (meta.orientation ?? 1) >= 5;
    const ancho = giradaEnExif ? meta.height : meta.width;
    const alto = giradaEnExif ? meta.width : meta.height;

    return {
      dataUri: `data:image/png;base64,${png.toString("base64")}`,
      proporcion: ancho && alto ? ancho / alto : 612 / 792,
    };
  } catch {
    return {
      dataUri: `data:${archivo.mime};base64,${archivo.bytes.toString("base64")}`,
      proporcion: 612 / 792,
    };
  }
}

export async function leerPdfAnexo(src: string, publicDir: string): Promise<Buffer | null> {
  const archivo = await descargar(src, publicDir);
  if (!archivo) return null;
  // Un blob mal tipado llega como octet-stream; el header es más confiable que
  // el content-type que haya quedado guardado.
  if (archivo.bytes.subarray(0, 4).toString("latin1") !== "%PDF") return null;
  return archivo.bytes;
}

/// Pega los PDF en el orden recibido. Un anexo corrupto o protegido no tumba el
/// documento: se salta y el rider sale sin él, que es mejor que no salir.
export async function unirPdfs(partes: Buffer[]): Promise<Buffer> {
  const vivas = partes.filter((p) => p.length > 0);
  if (vivas.length === 0) return Buffer.alloc(0);
  if (vivas.length === 1) return vivas[0];

  const salida = await PDFDocument.create();
  for (const parte of vivas) {
    try {
      const doc = await PDFDocument.load(parte, { ignoreEncryption: true });
      const paginas = await salida.copyPages(doc, doc.getPageIndices());
      for (const p of paginas) salida.addPage(p);
    } catch {
      continue;
    }
  }

  if (salida.getPageCount() === 0) return vivas[0];
  return Buffer.from(await salida.save());
}
