// Transcribe el Word del rider del artista a la ficha de la plataforma.
//
// Dos llamadas, un solo endpoint: sin `secciones` lee el documento y devuelve la
// propuesta para que se corrija en pantalla; con `secciones` guarda lo que quedó
// aprobado. La lectura es determinista (ver src/lib/rider-docx-import.ts): lo
// que el documento no dice, no se inventa aquí.
//
// Los renglones de equipo se AGREGAN por omisión: no se borra lo que ya estaba,
// porque esas líneas pueden estar ya cotejadas en el advance de un show. Con
// `reemplazar` se borran primero, que es lo que hace falta cuando el rider ya
// venía transcrito a mano y el documento es la versión buena.

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import mammoth from "mammoth";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DISCIPLINAS, leerSeccionesExtra } from "@/lib/giras";
import { leerRiderDocx } from "@/lib/rider-docx-import";

export const runtime = "nodejs";

/// Los campos de notas a los que se puede mandar una sección del documento.
const CAMPOS_NOTA = [
  "requerimientosGenerales",
  "notasEscenario",
  "notasEnergia",
  "notasFoh",
  "notasMonitoreo",
  "notasBackline",
  "notasVideo",
  "notasIluminacion",
  "notasCrewRequerido",
  "notasHospitalidad",
] as const;

type CampoNota = (typeof CAMPOS_NOTA)[number];

interface RenglonEntrante {
  cantidad?: number | string | null;
  numero?: number | string | null;
  concepto?: string | null;
  notas?: string | null;
}

interface SeccionEntrante {
  titulo?: string | null;
  texto?: string | null;
  /// "SECCION" (sección propia del documento) | "NINGUNO" | un campo de notas.
  destino?: string | null;
  departamento?: string | null;
  /// Cuando la sección es un input/output list, sus renglones son canales de
  /// consola y no equipo que se le pida al venue.
  lista?: string | null;
  renglones?: RenglonEntrante[];
}

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

/// El documento se baja de Vercel Blob y de ningún otro lugar: la URL viene del
/// navegador, y buscarla a ciegas desde el servidor sería un SSRF de regalo.
function esUrlDeBlob(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;

  const rider = await prisma.artistaRider.findUnique({
    where: { id: riderId },
    select: { id: true, seccionesExtra: true },
  });
  if (!rider) return NextResponse.json({ error: "Rider no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  // ── Lectura ───────────────────────────────────────────────────────────────
  if (!Array.isArray(body.secciones)) {
    const url = texto(body.archivoUrl);
    if (!url || !esUrlDeBlob(url)) {
      return NextResponse.json({ error: "Sube el documento antes de leerlo" }, { status: 400 });
    }
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: "No se pudo bajar el documento" }, { status: 502 });

    try {
      const buffer = Buffer.from(await res.arrayBuffer());
      const { value } = await mammoth.convertToHtml({ buffer });
      const lectura = leerRiderDocx(value);
      if (lectura.secciones.length === 0) {
        return NextResponse.json({ error: "No se reconoció nada en ese documento" }, { status: 400 });
      }
      return NextResponse.json(lectura);
    } catch {
      return NextResponse.json({ error: "Ese archivo no se pudo leer como Word (.docx)" }, { status: 400 });
    }
  }

  // ── Guardado ──────────────────────────────────────────────────────────────
  const entrantes = body.secciones as SeccionEntrante[];

  const reemplazar = body.reemplazar === true;

  const notas: Partial<Record<CampoNota, string>> = {};
  const extras = reemplazar ? [] : leerSeccionesExtra(rider.seccionesExtra);
  const lineas: { disciplina: string; concepto: string; cantidad: number; notas: string | null }[] = [];
  const canales: { tipo: string; numero: number; nombre: string; notas: string | null }[] = [];

  for (const s of entrantes) {
    const destino = typeof s.destino === "string" ? s.destino : "SECCION";
    const cuerpo = texto(s.texto);
    const titulo = texto(s.titulo);

    if (cuerpo) {
      if (CAMPOS_NOTA.includes(destino as CampoNota)) {
        const campo = destino as CampoNota;
        // Dos secciones del documento pueden caer en el mismo campo (FOH y
        // "consola de FOH"): se concatenan en el orden del documento.
        notas[campo] = notas[campo] ? `${notas[campo]}\n\n${cuerpo}` : cuerpo;
      } else if (destino === "SECCION") {
        extras.push({
          id: `doc-${Date.now()}-${extras.length}`,
          titulo: titulo ?? "Sección del rider",
          contenido: cuerpo,
        });
      }
    }

    // Un input/output list son canales de consola: van a la pestaña de canales
    // y no ensucian la lista de equipo que se cotejará contra el venue.
    if (s.lista === "INPUT" || s.lista === "OUTPUT") {
      let posicion = 0;
      for (const r of s.renglones ?? []) {
        const nombre = texto(r.concepto);
        if (!nombre) continue;
        posicion++;
        const numero = Number(r.numero);
        canales.push({
          tipo: s.lista,
          // Si el documento no numeró el canal, se numera por su posición.
          numero: Number.isFinite(numero) && numero > 0 ? Math.trunc(numero) : posicion,
          nombre,
          notas: texto(r.notas),
        });
      }
      continue;
    }

    const disciplina =
      typeof s.departamento === "string" && DISCIPLINAS.includes(s.departamento as (typeof DISCIPLINAS)[number])
        ? s.departamento
        : "OTRO";

    for (const r of s.renglones ?? []) {
      const concepto = texto(r.concepto);
      if (!concepto) continue;
      const cantidad = Number(r.cantidad);
      lineas.push({
        disciplina,
        concepto,
        // El documento que no dice cuántos entra como uno; el preview lo avisa.
        cantidad: Number.isFinite(cantidad) && cantidad > 0 ? Math.trunc(cantidad) : 1,
        notas: texto(r.notas),
      });
    }
  }

  const desde = reemplazar ? 0 : await prisma.artistaRiderLinea.count({ where: { riderId } });

  await prisma.$transaction(async (tx) => {
    if (reemplazar) {
      await tx.artistaRiderLinea.deleteMany({ where: { riderId } });
      await tx.artistaRiderCanal.deleteMany({ where: { riderId } });
    }
    await tx.artistaRider.update({
      where: { id: riderId },
      data: { ...notas, seccionesExtra: extras as unknown as Prisma.InputJsonValue },
    });
    if (lineas.length > 0) {
      await tx.artistaRiderLinea.createMany({
        data: lineas.map((l, i) => ({ ...l, riderId, orden: desde + i })),
      });
    }
    if (canales.length > 0) {
      await tx.artistaRiderCanal.createMany({ data: canales.map((c) => ({ ...c, riderId })) });
    }
  });

  return NextResponse.json({
    lineas: lineas.length,
    canales: canales.length,
    secciones: extras.length,
    notas: Object.keys(notas).length,
  });
}
