import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureEntradasProspectoTable, parseLineaProspecto } from "@/lib/bandeja-prospectos";

const normTel = (t?: string | null) => (t ?? "").replace(/\D/g, "");
const normMail = (m?: string | null) => (m ?? "").toLowerCase().trim();
const normNom = (n?: string | null) => (n ?? "").toLowerCase().replace(/\s+/g, " ").trim();

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureEntradasProspectoTable();
  const entradas = await prisma.entradaProspecto.findMany({ orderBy: { createdAt: "desc" } });

  // Detección de duplicados contra la base de contactos existente (best-effort).
  const clientes = await prisma.cliente.findMany({
    select: { id: true, nombre: true, telefono: true, correo: true },
  });
  const porTel = new Map<string, { id: string; nombre: string }>();
  const porMail = new Map<string, { id: string; nombre: string }>();
  const porNom = new Map<string, { id: string; nombre: string }>();
  for (const c of clientes) {
    const ref = { id: c.id, nombre: c.nombre };
    if (normTel(c.telefono).length >= 8) porTel.set(normTel(c.telefono), ref);
    if (normMail(c.correo)) porMail.set(normMail(c.correo), ref);
    if (normNom(c.nombre)) porNom.set(normNom(c.nombre), ref);
  }

  const conDuplicados = entradas.map((e) => {
    let dup: { id: string; nombre: string } | null = null;
    if (normTel(e.telefono).length >= 8) dup = porTel.get(normTel(e.telefono)) ?? null;
    if (!dup && normMail(e.correo)) dup = porMail.get(normMail(e.correo)) ?? null;
    if (!dup && normNom(e.nombre)) dup = porNom.get(normNom(e.nombre)) ?? null;
    return { ...e, duplicadoDe: dup };
  });

  return NextResponse.json({ entradas: conDuplicados });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  await ensureEntradasProspectoTable();

  // Registro masivo: una entrada por línea, conservando el texto original íntegro.
  const lineas: string[] = Array.isArray(body.lineas)
    ? body.lineas
    : typeof body.textoOriginal === "string"
      ? [body.textoOriginal]
      : [];

  const limpias = lineas.map((l) => (l ?? "").replace(/\r/g, "")).filter((l) => l.trim().length > 0);
  if (limpias.length === 0) {
    return NextResponse.json({ error: "No hay líneas para registrar" }, { status: 400 });
  }

  const data = limpias.map((linea) => {
    const p = parseLineaProspecto(linea);
    return {
      textoOriginal: linea,
      nombre: p.nombre,
      correo: p.correo,
      telefono: p.telefono,
      capturadoPor: session.id,
    };
  });

  await prisma.entradaProspecto.createMany({ data });
  return NextResponse.json({ ok: true, creadas: data.length });
}
