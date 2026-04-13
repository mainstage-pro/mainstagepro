import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Ensure table exists (safe to call multiple times)
async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS gastos_operativos (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "proyectoId" TEXT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      concepto TEXT NOT NULL,
      monto DOUBLE PRECISION NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1,
      entregado BOOLEAN NOT NULL DEFAULT false,
      "fechaEntrega" TIMESTAMP,
      notas TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const proyectoId = req.nextUrl.searchParams.get("proyectoId");
  await ensureTable();

  if (proyectoId) {
    const gastos = await prisma.$queryRawUnsafe<GastoRow[]>(
      `SELECT * FROM gastos_operativos WHERE "proyectoId" = $1 ORDER BY "createdAt" ASC`,
      proyectoId
    );
    return NextResponse.json({ gastos });
  }

  // Vista semanal para administración — todos los proyectos con gastos pendientes
  const gastos = await prisma.$queryRawUnsafe<GastoRow[]>(`
    SELECT g.*, p.nombre AS "proyectoNombre", p."fechaEvento", p."numeroProyecto"
    FROM gastos_operativos g
    JOIN proyectos p ON p.id = g."proyectoId"
    WHERE g.entregado = false
    ORDER BY p."fechaEvento" ASC
  `);
  return NextResponse.json({ gastos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureTable();
  const body = await req.json();
  const { proyectoId, tipo, concepto, monto, cantidad, notas } = body;

  if (!proyectoId || !concepto || !monto) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const [gasto] = await prisma.$queryRawUnsafe<GastoRow[]>(`
    INSERT INTO gastos_operativos ("proyectoId", tipo, concepto, monto, cantidad, notas)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, proyectoId, tipo ?? "OTRO", concepto, Number(monto), Number(cantidad ?? 1), notas ?? null);

  return NextResponse.json({ gasto });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureTable();
  const body = await req.json();
  const { id, entregado, notas } = body;

  const [gasto] = await prisma.$queryRawUnsafe<GastoRow[]>(`
    UPDATE gastos_operativos
    SET entregado = $2,
        "fechaEntrega" = CASE WHEN $2 THEN NOW() ELSE NULL END,
        notas = COALESCE($3, notas)
    WHERE id = $1
    RETURNING *
  `, id, entregado, notas ?? null);

  return NextResponse.json({ gasto });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureTable();
  const { id } = await req.json();
  await prisma.$executeRawUnsafe(`DELETE FROM gastos_operativos WHERE id = $1`, id);
  return NextResponse.json({ ok: true });
}

interface GastoRow {
  id: string;
  proyectoId: string;
  tipo: string;
  concepto: string;
  monto: number;
  cantidad: number;
  entregado: boolean;
  fechaEntrega: string | null;
  notas: string | null;
  createdAt: string;
  proyectoNombre?: string;
  fechaEvento?: string;
  numeroProyecto?: string;
}
