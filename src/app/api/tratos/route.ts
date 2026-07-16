import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { cotejarOCrearCliente } from "@/lib/cotejo-cliente";
import { ensureProcesoVentaColumns } from "@/lib/migraciones-lazy";
import { defaultEtapaInterna } from "@/lib/etapasInternas";

// Mapeo momento de contratación → etapa por defecto del pipeline (el vendedor puede sobreescribir).
const MOMENTO_ETAPA: Record<string, string> = {
  EXPLORANDO: "LEAD",
  COTIZANDO: "DESCUBRIMIENTO",
  LISTO_DECIDIR: "OPORTUNIDAD",
  URGENTE: "OPORTUNIDAD",
};

// Add columns lazily on first request (safe to run multiple times)
let _colsReady = false;
async function ensureColumns() {
  if (_colsReady) return;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "vendedorId" TEXT REFERENCES users(id) ON DELETE SET NULL`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "momentoContratacion" TEXT`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "posibleDuplicado" BOOLEAN NOT NULL DEFAULT false`
    );
  } catch { /* columns already exist */ }
  _colsReady = true;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureColumns();
  await ensureProcesoVentaColumns();

  const { searchParams } = new URL(request.url);
  const responsableId = searchParams.get("responsableId");

  const tipoProspecto = searchParams.get("tipoProspecto");

  const filtro = searchParams.get("filtro");

  const where: Record<string, unknown> = {};
  if (responsableId) where.responsableId = responsableId;
  if (tipoProspecto) where.tipoProspecto = tipoProspecto;
  const clienteIdFilter = searchParams.get("clienteId");
  if (clienteIdFilter) where.clienteId = clienteIdFilter;
  if (filtro === "enfriados") {
    where.etapa     = { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] };
    where.createdAt = { lte: new Date(Date.now() - 15 * 86400000) };
  }

  const tratos = await prisma.trato.findMany({
    where,
    select: {
      id: true, etapa: true, etapaInterna: true, tipoEvento: true, tipoServicio: true, nombreEvento: true,
      fechaEventoEstimada: true, presupuestoEstimado: true, lugarEstimado: true,
      origenLead: true, fechaProximaAccion: true, createdAt: true, fechaCierre: true,
      tipoProspecto: true, nurturingData: true, proximaAccion: true,
      momentoContratacion: true, posibleDuplicado: true,
      updatedAt: true, etapaCambiadaEn: true, confirmadaEn: true,
      descubrimientoCompleto: true, formEstado: true,
      modoDescubrimiento: true, preferenciaContacto: true,
      cliente: { select: { id: true, nombre: true, empresa: true, telefono: true } },
      responsable: { select: { id: true, name: true } },
      cotizaciones: {
        select: {
          id: true, numeroCotizacion: true, estado: true, granTotal: true,
          fechaEvento: true, createdAt: true, opcionLetra: true, grupoId: true,
          proyecto: { select: { id: true, numeroProyecto: true, nombre: true, estado: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [
      { fechaEventoEstimada: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json({ tratos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureColumns();

  try {
    const body = await request.json();

    // origenLead es obligatorio: sin origen no se puede atribuir el lead.
    if (!body.origenLead) {
      return NextResponse.json({ error: "origen requerido" }, { status: 400 });
    }

    // Si viene clienteNuevo, cotejar contra clientes existentes (no crear a ciegas).
    let clienteId = body.clienteId;
    let posibleDuplicado = false;
    let candidatoDuplicado: { id: string; nombre: string; telefono: string | null; correo: string | null } | undefined;
    if (!clienteId && body.clienteNuevo) {
      const c = body.clienteNuevo;
      const cotejo = await cotejarOCrearCliente({
        nombre: c.nombre,
        telefono: c.telefono,
        correo: c.correo,
        origenLead: body.origenLead,
        campana: body.campana,
      });
      clienteId = cotejo.clienteId;
      if (cotejo.estado === "DUPLICADO_POSIBLE") {
        posibleDuplicado = true;
        candidatoDuplicado = cotejo.clienteExistente;
      }
      // Completar datos que el helper no captura (empresa/tipo) sobre el cliente ligado o creado.
      if (clienteId && (c.empresa || c.tipoCliente)) {
        await prisma.cliente.update({
          where: { id: clienteId },
          data: {
            ...(c.empresa ? { empresa: c.empresa } : {}),
            ...(cotejo.estado === "CREADO" && c.tipoCliente ? { tipoCliente: c.tipoCliente } : {}),
          },
        });
      }
    }

    if (!clienteId) {
      return NextResponse.json({ error: "Cliente requerido" }, { status: 400 });
    }

    // Determine etapa: NURTURING → LEAD; etapa explícita gana; si no, se deriva del momento; default DESCUBRIMIENTO.
    const momento: string | null = body.momentoContratacion || null;
    const trato_etapa = body.tipoProspecto === 'NURTURING'
      ? 'LEAD'
      : (body.etapa || (momento && MOMENTO_ETAPA[momento]) || 'DESCUBRIMIENTO');

    const trato = await prisma.trato.create({
      data: {
        clienteId,
        responsableId: body.responsableId || session.id,
        vendedorId: body.vendedorId || session.id,
        tipoEvento: body.tipoEvento || "OTRO",
        tipoLead: body.tipoLead || "INBOUND",
        origenLead: body.origenLead || "ORGANICO",
        origenVenta: body.origenVenta || "CLIENTE_PROPIO",
        vendedorOrigenId: body.vendedorOrigenId || null,
        estatusContacto: "PENDIENTE",
        etapa: trato_etapa,
        etapaInterna: defaultEtapaInterna(trato_etapa),
        clasificacion: body.clasificacion || "PROSPECTO",
        tipoServicio: body.tipoServicio || null,
        tipoProspecto: body.tipoProspecto || "ACTIVO",
        canalAtencion: body.canalAtencion || null,
        rutaEntrada: body.rutaEntrada || "DESCUBRIR",
        etapaContratacion: body.etapaContratacion || null,
        momentoContratacion: momento,
        posibleDuplicado,
        nombreEvento: body.nombreEvento || null,
        lugarEstimado: body.lugarEstimado || null,
        asistentesEstimados: body.asistentesEstimados ? parseInt(body.asistentesEstimados) : null,
        fechaEventoEstimada: body.fechaEventoEstimada ? new Date(body.fechaEventoEstimada) : null,
        presupuestoEstimado: body.presupuestoEstimado ? parseFloat(body.presupuestoEstimado) : null,
        notas: body.notas || null,
        proximaAccion: body.proximaAccion || null,
        fechaProximaAccion: body.fechaProximaAccion ? new Date(body.fechaProximaAccion) : null,
        // Campos del trato seguro (venta cerrada)
        confirmadaEn: body.confirmadaEn ? new Date(body.confirmadaEn) : null,
        fechaCierre: body.fechaCierre ? new Date(body.fechaCierre) : null,
        metodoConfirmacion: body.metodoConfirmacion || null,
      },
    });

    // Si la clasificación cambió respecto al cliente actual, actualizarla
    if (body.clasificacion && body.clasificacionOriginal !== body.clasificacion) {
      await prisma.cliente.update({
        where: { id: clienteId },
        data: { clasificacion: body.clasificacion },
      });
    }

    return NextResponse.json({ trato, posibleDuplicado, candidato: candidatoDuplicado });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear trato" }, { status: 500 });
  }
}
