import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureGlosarioTabla } from "@/lib/migraciones-lazy";
import { normalizarTermino, esFraseEspecifica, type TipoObjetivo } from "@/lib/glosario";

export const runtime = "nodejs";

const TIPOS: TipoObjetivo[] = ["EQUIPO", "ACCESORIO", "ROL_TECNICO", "PRODUCTO"];

// Aprendizaje: cuando el humano reasigna una línea de la previa, guardamos la frase
// que escribió → el objeto que eligió, como término "aprendido". Así la próxima vez
// esa frase resuelve directo. Solo se aprenden frases específicas (ver esFraseEspecifica).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureGlosarioTabla();

  const body = await req.json().catch(() => ({}));
  const original = typeof body?.termino === "string" ? body.termino.trim() : "";
  const tipoObjetivo = body?.tipoObjetivo as TipoObjetivo;
  const objetivoId = typeof body?.objetivoId === "string" ? body.objetivoId : "";

  if (!original || !objetivoId || !TIPOS.includes(tipoObjetivo)) {
    return NextResponse.json({ aprendido: false, motivo: "datos_incompletos" });
  }

  const termino = normalizarTermino(original);
  if (!termino) return NextResponse.json({ aprendido: false, motivo: "vacio" });

  // No encasillar palabras genéricas de una sola raíz: seguirán ofreciendo el selector.
  if (!esFraseEspecifica(original)) {
    return NextResponse.json({ aprendido: false, motivo: "generico" });
  }

  // Si ya apunta a ese mismo objetivo, no hay nada que reescribir.
  const existente = await prisma.glosarioTermino.findUnique({ where: { termino } });
  if (existente && existente.objetivoId === objetivoId) {
    return NextResponse.json({ aprendido: true, yaExistia: true });
  }

  // Upsert: el humano corrige, su elección gana. Se marca fuente "aprendido".
  await prisma.glosarioTermino.upsert({
    where: { termino },
    update: { objetivoId, tipoObjetivo, fuente: "aprendido", activo: true },
    create: { termino, original, objetivoId, tipoObjetivo, fuente: "aprendido" },
  });

  return NextResponse.json({ aprendido: true, repunteo: !!existente });
}
