import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { getCuentasScope } from "@/lib/estado-cuenta";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      vendedor: { select: { id: true, name: true } },
      compania: { select: { id: true, nombre: true, tipo: true } },
      tratos: {
        select: { id: true, etapa: true, tipoEvento: true, nombreEvento: true, lugarEstimado: true, fechaEventoEstimada: true, presupuestoEstimado: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: "desc" },
      },
      cotizaciones: {
        select: { id: true, numeroCotizacion: true, nombreEvento: true, estado: true, granTotal: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      proyectos: {
        select: { id: true, numeroProyecto: true, nombre: true, estado: true, fechaEvento: true },
        orderBy: { fechaEvento: "desc" },
      },
    },
  });

  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // ── Cuentas por cobrar / pagar con alcance de EMPRESA ────────────────────────
  // Se cobra a la empresa, no al contacto: si el cliente pertenece a una empresa,
  // se agregan las cuentas de todos sus contactos y las ligadas a la empresa.
  const { cuentasCobrar, cuentasPagar } = await getCuentasScope({
    clienteId: id,
    empresaId: cliente.empresaId,
  });

  return NextResponse.json({ cliente: { ...cliente, cuentasCobrar, cuentasPagar } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await params;

  const activos = await prisma.proyecto.count({
    where: { clienteId: id, estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] } },
  });
  if (activos > 0) {
    return NextResponse.json({ error: `El cliente tiene ${activos} proyecto(s) activo(s). Ciérralos antes de eliminar.` }, { status: 409 });
  }

  const cliente = await prisma.cliente.findUnique({ where: { id }, select: { nombre: true, empresa: true } });
  await logActividad(session.id, "ELIMINAR", "cliente", id, `Cliente eliminado: ${cliente?.nombre ?? id} (${cliente?.empresa ?? ""})`);
  await prisma.cliente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = ["nombre", "tipoCliente", "clasificacion", "perfilProspecto", "servicioUsual", "telefono", "correo", "notas", "vendedorId", "origenLead"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key] !== undefined ? body[key] || null : null;
  }
  // esProspecto: boolean field — explicit
  if ("esProspecto" in body) {
    data.esProspecto = Boolean(body.esProspecto);
  }
  // tiposEvento: accept JSON-stringified array or null — don't coerce empty string to null
  if ("tiposEvento" in body) {
    data.tiposEvento = body.tiposEvento ?? null;
  }

  // Handle empresa: accept empresaId (FK) or plain empresa name
  if ("empresaId" in body) {
    const newId: string | null = body.empresaId || null;
    data.empresaId = newId;
    if (newId) {
      const emp = await prisma.empresa.findUnique({ where: { id: newId }, select: { nombre: true } });
      data.empresa = emp?.nombre ?? null;
    } else {
      data.empresa = null;
    }
  } else if ("empresa" in body) {
    const nombre: string | null = body.empresa || null;
    if (nombre) {
      // Find or create empresa
      let emp = await prisma.empresa.findFirst({
        where: { nombre: { equals: nombre, mode: "insensitive" }, activo: true },
      });
      if (!emp) {
        emp = await prisma.empresa.create({ data: { nombre, tipo: "CLIENTE" } });
      }
      data.empresa = emp.nombre;
      data.empresaId = emp.id;
    } else {
      data.empresa = null;
      data.empresaId = null;
    }
  }

  const cliente = await prisma.cliente.update({
    where: { id },
    data,
    include: {
      compania: { select: { id: true, nombre: true } },
      vendedor: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ cliente });
}
