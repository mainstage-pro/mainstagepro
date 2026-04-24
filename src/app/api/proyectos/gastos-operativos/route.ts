import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function proximoMiercolesTraEvento(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
  return d;
}

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
      "cxpId" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS "cxpId" TEXT;`
  );
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

  const montoTotal = Number(monto) * Number(cantidad ?? 1);

  const [gasto] = await prisma.$queryRawUnsafe<GastoRow[]>(`
    INSERT INTO gastos_operativos ("proyectoId", tipo, concepto, monto, cantidad, notas)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, proyectoId, tipo ?? "OTRO", concepto, Number(monto), Number(cantidad ?? 1), notas ?? null);

  // Create linked CxP so it appears in cuentas por pagar
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { fechaEvento: true },
  });
  const fechaCompromiso = proyecto?.fechaEvento
    ? proximoMiercolesTraEvento(proyecto.fechaEvento)
    : new Date();

  const cxp = await prisma.cuentaPagar.create({
    data: {
      tipoAcreedor: "OTRO",
      concepto: `${tipo ?? "Gasto"} — ${concepto}`,
      monto: montoTotal,
      fechaCompromiso,
      estado: "PENDIENTE",
      proyectoId,
      notas: notas || null,
    },
  });

  await prisma.$executeRawUnsafe(
    `UPDATE gastos_operativos SET "cxpId" = $1 WHERE id = $2`,
    cxp.id, gasto.id
  );

  return NextResponse.json({ gasto: { ...gasto, cxpId: cxp.id } });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureTable();
  const body = await req.json();
  const { id, entregado, notas } = body;

  // Fetch before update to get cxpId and amounts
  const [gastoAntes] = await prisma.$queryRawUnsafe<GastoRow[]>(
    `SELECT * FROM gastos_operativos WHERE id = $1`, id
  );

  const [gasto] = await prisma.$queryRawUnsafe<GastoRow[]>(`
    UPDATE gastos_operativos
    SET entregado = $2,
        "fechaEntrega" = CASE WHEN $2 THEN NOW() ELSE NULL END,
        notas = COALESCE($3, notas)
    WHERE id = $1
    RETURNING *
  `, id, entregado, notas ?? null);

  // Auto-confirm: when marking as delivered, create MovimientoFinanciero + liquidate CxP
  if (entregado && gastoAntes?.cxpId) {
    const cxp = await prisma.cuentaPagar.findUnique({ where: { id: gastoAntes.cxpId }, select: { estado: true } });
    if (cxp && cxp.estado !== "LIQUIDADO") {
      const movimiento = await prisma.movimientoFinanciero.create({
        data: {
          tipo: "GASTO",
          fecha: new Date(),
          concepto: gastoAntes.concepto,
          monto: gastoAntes.monto * gastoAntes.cantidad,
          proyectoId: gastoAntes.proyectoId,
          metodoPago: "EFECTIVO",
          notas: notas || null,
          creadoPor: session.id,
        },
      });
      await prisma.cuentaPagar.update({
        where: { id: gastoAntes.cxpId },
        data: {
          estado: "LIQUIDADO",
          fechaPagoReal: new Date(),
          movimientoId: movimiento.id,
        },
      });
    }
  }

  return NextResponse.json({ gasto });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureTable();
  const { id } = await req.json();

  // Fetch before delete to get cxpId
  const [gastoAntes] = await prisma.$queryRawUnsafe<GastoRow[]>(
    `SELECT * FROM gastos_operativos WHERE id = $1`, id
  );

  await prisma.$executeRawUnsafe(`DELETE FROM gastos_operativos WHERE id = $1`, id);

  // Delete linked CxP only if not yet paid
  if (gastoAntes?.cxpId) {
    const cxp = await prisma.cuentaPagar.findUnique({ where: { id: gastoAntes.cxpId }, select: { estado: true } });
    if (cxp && cxp.estado !== "LIQUIDADO") {
      await prisma.cuentaPagar.delete({ where: { id: gastoAntes.cxpId } });
    }
  }

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
  cxpId: string | null;
  createdAt: string;
  proyectoNombre?: string;
  fechaEvento?: string;
  numeroProyecto?: string;
}
