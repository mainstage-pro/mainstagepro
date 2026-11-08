import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeVerFormularios, parseJSON } from "@/lib/formularios";
import * as XLSX from "xlsx";

type Preg = { id: string; codigo: string | null; texto: string; tipo: string };

function textoValor(valor: string | null, tipo: string): string {
  if (!valor) return "";
  const parsed = parseJSON<unknown>(valor, null);
  if (parsed == null) return "";
  if (Array.isArray(parsed)) return parsed.join(" | ");
  if (typeof parsed === "object") {
    try { return JSON.stringify(parsed); } catch { return ""; }
  }
  if (typeof parsed === "boolean") return parsed ? "Sí" : "No";
  if (tipo === "si_no") return parsed ? "Sí" : "No";
  return String(parsed);
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerFormularios(session))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await context.params;
  const formato = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "xlsx";

  const formulario = await prisma.formulario.findUnique({
    where: { id },
    include: {
      secciones: {
        where: { archivada: false },
        orderBy: { orden: "asc" },
        include: {
          preguntas: {
            where: { archivada: false },
            orderBy: { orden: "asc" },
            select: { id: true, codigo: true, texto: true, tipo: true },
          },
        },
      },
      respuestas: {
        orderBy: { enviadoAt: "desc" },
        include: { respuestasPreguntas: true },
      },
    },
  });
  if (!formulario) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const preguntas: Preg[] = formulario.secciones.flatMap((s) => s.preguntas);

  const encabezados = [
    "Enviado",
    ...preguntas.map((p) => (p.codigo ? `${p.codigo} ${p.texto}` : p.texto)),
    "Puntaje",
    "Banda",
  ];

  const filas = formulario.respuestas.map((r) => {
    const mapa = new Map(r.respuestasPreguntas.map((rp) => [rp.preguntaId, rp.valor]));
    return [
      r.enviadoAt.toISOString(),
      ...preguntas.map((p) => textoValor(mapa.get(p.id) ?? null, p.tipo)),
      "—",
      "—",
    ];
  });

  const nombre = `respuestas-${formulario.slug}`;

  if (formato === "csv") {
    const ws = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
    const csv = XLSX.utils.sheet_to_csv(ws);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombre}.csv"`,
      },
    });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
  XLSX.utils.book_append_sheet(wb, ws, "Respuestas");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const body = new Uint8Array(buffer);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}.xlsx"`,
    },
  });
}
