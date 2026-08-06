import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";
import { put } from "@vercel/blob";
import { validarArchivo } from "@/lib/upload-validation";

type ArchivoHist = { nombre: string; url: string; tipo: string | null };

// PATCH /api/tareas/[id]/evidencia-historial
// FormData: ocurrenciaAt (req), evidenciaNota, archivosKeep (JSON de los archivos
// existentes a conservar) y 0+ `file` (fotos/archivos nuevos a subir).
// Corrige una ocurrencia archivada (típicamente RECHAZADA) y la devuelve a
// PENDIENTE_VERIFICACION para que el verificador la revise de nuevo. Sólo el
// responsable de la tarea o un ADMIN pueden corregir.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  const { id } = await params;
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const ocurrenciaAt = typeof form.get("ocurrenciaAt") === "string" ? (form.get("ocurrenciaAt") as string) : null;
  const evidenciaNotaRaw = typeof form.get("evidenciaNota") === "string" ? (form.get("evidenciaNota") as string) : null;
  if (!ocurrenciaAt) return NextResponse.json({ error: "Falta ocurrenciaAt" }, { status: 400 });

  const t = await prisma.tarea.findUnique({
    where: { id },
    select: { id: true, evidenciasHistorial: true, asignadoAId: true, tipoEvidencia: true },
  });
  if (!t) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const puedeCorregir = session.role === "ADMIN" || t.asignadoAId === session.id;
  if (!puedeCorregir) {
    return NextResponse.json({ error: "Solo el responsable puede corregir la evidencia.", code: "SOLO_RESPONSABLE" }, { status: 403 });
  }

  let hist: Record<string, unknown>[] = [];
  try {
    const parsed = t.evidenciasHistorial ? JSON.parse(t.evidenciasHistorial) : [];
    if (Array.isArray(parsed)) hist = parsed as Record<string, unknown>[];
  } catch {
    return NextResponse.json({ error: "Historial ilegible" }, { status: 500 });
  }

  const idx = hist.findIndex((h) => h.completadaAt === ocurrenciaAt);
  if (idx < 0) return NextResponse.json({ error: "Ocurrencia no encontrada" }, { status: 404 });

  const entry = hist[idx];
  const tipoEvid = (entry.tipoEvidencia as string | null) ?? t.tipoEvidencia;
  const nota = (evidenciaNotaRaw ?? "").trim();

  // Archivos existentes que el usuario decidió conservar.
  let archivos: ArchivoHist[] = [];
  const keepRaw = form.get("archivosKeep");
  if (typeof keepRaw === "string" && keepRaw) {
    try {
      const parsed = JSON.parse(keepRaw);
      if (Array.isArray(parsed)) {
        archivos = parsed
          .filter((a) => a && typeof a.url === "string")
          .map((a) => ({ nombre: String(a.nombre ?? "archivo"), url: String(a.url), tipo: a.tipo ?? null }));
      }
    } catch {
      return NextResponse.json({ error: "archivosKeep inválido" }, { status: 400 });
    }
  }

  // Archivos nuevos → subida a Blob.
  const nuevos = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of nuevos) {
    const validacion = validarArchivo(file);
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: validacion.status });
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const pathname = `tareas/${id}/hist/${Date.now()}-${safeName}`;
      const blob = await put(pathname, file, { access: "public" });
      archivos.push({ nombre: file.name, url: blob.url, tipo: file.type || null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[evidencia-historial PATCH]", msg);
      return NextResponse.json({ error: "Error al subir archivo: " + msg }, { status: 500 });
    }
  }

  // Validación: FOTO/ARCHIVO exigen al menos un archivo; NOTA/ENLACE exigen texto;
  // sin tipo definido basta con nota o archivo.
  const esArchivo = tipoEvid === "FOTO" || tipoEvid === "ARCHIVO";
  const esTexto = tipoEvid === "NOTA" || tipoEvid === "ENLACE_MODULO";
  if (esArchivo && archivos.length === 0) {
    return NextResponse.json({ error: "Adjunta al menos un archivo de evidencia.", code: "EVIDENCIA_REQUERIDA" }, { status: 422 });
  }
  if (esTexto && nota.length < 10) {
    return NextResponse.json({ error: "Escribe una nota de evidencia (mínimo 10 caracteres).", code: "EVIDENCIA_REQUERIDA" }, { status: 422 });
  }
  if (!tipoEvid && nota.length < 10 && archivos.length === 0) {
    return NextResponse.json({ error: "Escribe una nota (mínimo 10 caracteres) o adjunta un archivo.", code: "EVIDENCIA_REQUERIDA" }, { status: 422 });
  }

  hist[idx] = {
    ...entry,
    evidenciaNota: nota || null,
    archivos,
    estadoVerificacion: "PENDIENTE_VERIFICACION",
    motivoRechazo: null,
    verificadaPorId: null,
    verificadaPor: null,
    verificadaAt: null,
    corregidaAt: new Date().toISOString(),
    corregidaPor: session.name ?? null,
  };

  await prisma.tarea.update({ where: { id }, data: { evidenciasHistorial: JSON.stringify(hist) } });
  return NextResponse.json({ ok: true, ocurrenciaAt, entry: hist[idx] });
}
