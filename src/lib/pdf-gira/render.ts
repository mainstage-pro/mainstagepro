// src/lib/pdf-gira/render.ts
//
// Los documentos de la gira salen por dos puertas: el endpoint con sesión
// (descarga desde la app) y el enlace público por token (el foro o el crew lo
// abre en el teléfono). Las dos llaman al mismo generador, así que el PDF es
// idéntico y no hay un segundo diseño que mantener.
//
// El render es el mismo que ya usan los documentos del proyecto: se reusa tal
// cual para que los dos módulos se comporten igual.

import { bufferDePdf, respuestaPdf, type PdfProyecto } from "@/lib/pdf-proyecto/render";

export type PdfGira = PdfProyecto;

export { bufferDePdf, respuestaPdf };
