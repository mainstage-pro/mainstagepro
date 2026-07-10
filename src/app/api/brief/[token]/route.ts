import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @deprecated Flujo de brief reducido. Reemplazado por el formulario de descubrimiento
 * unificado en /f/[token] (ver src/app/f/[token] y src/app/api/f/[token]).
 * Se mantiene solo para links de brief ya enviados. No generar nuevos briefTokens.
 */

// GET — datos del trato (sin auth, solo token)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const rows = await prisma.$queryRaw<{
    id: string; etapa: string; nombreEvento: string | null; tipoEvento: string | null;
    lugarEstimado: string | null; fechaEventoEstimada: Date | null;
    presupuestoEstimado: number | null; asistentesEstimados: number | null;
    briefRecibidoEn: Date | null;
    clienteNombre: string; clienteEmpresa: string | null;
  }[]>`
    SELECT t.id, t.etapa, t."nombreEvento", t."tipoEvento",
           t."lugarEstimado", t."fechaEventoEstimada",
           t."presupuestoEstimado", t."asistentesEstimados",
           t."briefRecibidoEn",
           c.nombre AS "clienteNombre", c.empresa AS "clienteEmpresa"
    FROM tratos t
    JOIN clientes c ON c.id = t."clienteId"
    WHERE t."briefToken" = ${token}
    LIMIT 1
  `.catch(() => []);

  if (!rows.length) return NextResponse.json({ error: "Link inválido" }, { status: 404 });
  return NextResponse.json({ trato: rows[0] });
}

// POST — cliente envía su brief
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM tratos WHERE "briefToken" = ${token} LIMIT 1
  `.catch(() => []);

  if (!rows.length) return NextResponse.json({ error: "Link inválido" }, { status: 404 });

  const tratoId = rows[0].id;
  const fields: Record<string, unknown> = {};
  const allowed = [
    "nombreEvento", "tipoEvento", "lugarEstimado",
    "fechaEventoEstimada", "asistentesEstimados",
    "presupuestoEstimado", "notas",
    "horaInicioEvento", "horaFinEvento",
  ];
  for (const key of allowed) {
    if (key in body && body[key] !== "" && body[key] !== null && body[key] !== undefined) {
      fields[key] = body[key];
    }
  }

  // Build SET clause safely
  const setClauses = Object.keys(fields).map((k, i) => `"${k}" = $${i + 2}`);
  setClauses.push(`"briefRecibidoEn" = NOW()`);
  const values = [tratoId, ...Object.values(fields)];

  if (setClauses.length > 1) {
    await prisma.$executeRawUnsafe(
      `UPDATE tratos SET ${setClauses.join(", ")} WHERE id = $1`,
      ...values
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE tratos SET "briefRecibidoEn" = NOW() WHERE id = $1`,
      tratoId
    );
  }

  return NextResponse.json({ ok: true });
}
