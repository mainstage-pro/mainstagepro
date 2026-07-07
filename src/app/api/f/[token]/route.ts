import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── Ensure formRecibidoEn column exists ─────────────────────────────────────
let _colReady = false;
async function ensureFormRecibidoEn() {
  if (_colReady) return;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "formRecibidoEn" TIMESTAMP`
    );
  } catch { /* already exists */ }
  _colReady = true;
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureFormRecibidoEn();

  const trato = await prisma.trato.findUnique({
    where: { formToken: token },
    select: {
      id: true,
      tipoServicio: true,
      tipoEvento: true,
      rutaEntrada: true,
      // Campos pre-llenables en el formulario del cliente
      nombreEvento: true,
      fechaEventoEstimada: true,
      lugarEstimado: true,
      asistentesEstimados: true,
      presupuestoEstimado: true,
      horaInicioEvento: true,
      horaFinEvento: true,
      ventanaMontajeInicio: true,
      ventanaMontajeFin: true,
      horaTerminoMontaje: true,
      contactoVenueNombre: true,
      contactoVenueTelefono: true,
      formEstado: true,
      cliente: { select: { nombre: true } },
      responsable: { select: { id: true, name: true } },
    },
  });

  if (!trato) return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });

  // Si ya fue completado, lo devolvemos con completado=true PERO también incluimos
  // la info del trato para que el cliente pueda verla y pueda re-enviar
  if (trato.formEstado === "COMPLETADO") {
    return NextResponse.json({ completado: true, trato });
  }

  return NextResponse.json({ trato });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureFormRecibidoEn();

  const trato = await prisma.trato.findUnique({
    where: { formToken: token },
    select: {
      id: true,
      formEstado: true,
      nombreEvento: true,
      lugarEstimado: true,
      fechaEventoEstimada: true,
      asistentesEstimados: true,
      presupuestoEstimado: true,
      horaInicioEvento: true,
      horaFinEvento: true,
      ventanaMontajeInicio: true,
      ventanaMontajeFin: true,
      horaTerminoMontaje: true,
      contactoVenueNombre: true,
      contactoVenueTelefono: true,
      camposCliente: true,
      // Para notificación al vendedor
      responsable: { select: { id: true, name: true } },
      cliente: { select: { nombre: true } },
    },
  });

  if (!trato) return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });
  // ✅ Eliminado el bloqueo: el cliente puede re-enviar el formulario siempre

  const body = await req.json();

  // ── Smart merge: solo actualiza si el campo está vacío en el trato ────────
  // Regla: lo que el equipo de ventas ya capturó tiene prioridad y NO se sobreescribe.
  // Lo que el cliente llena cubre los huecos que quedaron abiertos.
  const camposLlenados: string[] = [];

  function merge<T>(tratoVal: T | null | undefined, clienteVal: T | undefined): T | null {
    if (tratoVal != null && tratoVal !== "") return tratoVal;      // ya lo tenemos
    if (clienteVal != null && clienteVal !== "") {
      return clienteVal;
    }
    return null;
  }

  function mergeStr(tratoVal: string | null | undefined, clienteKey: string): string | null {
    const clienteVal = body[clienteKey] as string | undefined;
    if (tratoVal) return tratoVal;
    if (clienteVal) { camposLlenados.push(clienteKey); return clienteVal; }
    return null;
  }

  const nombreEvento   = mergeStr(trato.nombreEvento,   "nombreEvento");
  const lugarEstimado  = body.lugar
    ? merge(trato.lugarEstimado, [body.lugar, body.ciudad].filter(Boolean).join(" · ") || body.lugar)
    : trato.lugarEstimado;
  if (!trato.lugarEstimado && body.lugar) camposLlenados.push("lugar");

  const fechaEvento    = trato.fechaEventoEstimada
    ? trato.fechaEventoEstimada
    : body.fechaEvento ? (camposLlenados.push("fechaEvento"), new Date(body.fechaEvento)) : null;

  const asistentes     = trato.asistentesEstimados
    ? trato.asistentesEstimados
    : body.asistentes ? (camposLlenados.push("asistentes"), parseInt(body.asistentes)) : null;

  const presupuesto    = trato.presupuestoEstimado
    ? trato.presupuestoEstimado
    : body.presupuesto ? (camposLlenados.push("presupuesto"), parseFloat(body.presupuesto)) : null;

  const horaInicio     = mergeStr(trato.horaInicioEvento,    "horaInicioEvento");
  const horaFin        = mergeStr(trato.horaFinEvento,       "horaFinEvento");
  const ventanaInicio  = mergeStr(trato.ventanaMontajeInicio,"ventanaMontajeInicio");
  const ventanaFin     = mergeStr(trato.ventanaMontajeFin,   "ventanaMontajeFin");
  const horaTermino    = mergeStr(trato.horaTerminoMontaje,  "horaTerminoMontaje");
  const venueNombre    = mergeStr(trato.contactoVenueNombre,  "contactoVenueNombre");
  const venueTelefono  = mergeStr(trato.contactoVenueTelefono,"contactoVenueTelefono");

  // Combinar lista de campos del cliente (puede ser un reenvío)
  const prevCampos: string[] = trato.camposCliente ? JSON.parse(trato.camposCliente) : [];
  const todosCampos = Array.from(new Set([...prevCampos, ...camposLlenados]));

  await prisma.$executeRawUnsafe(
    `UPDATE tratos SET
      "formRespuestas" = $1,
      "formEstado" = 'COMPLETADO',
      "descubrimientoCompleto" = true,
      "camposCliente" = $2,
      "formRecibidoEn" = NOW()
    WHERE id = $3`,
    JSON.stringify(body),
    JSON.stringify(todosCampos),
    trato.id
  );

  // Guardar equiposInteres si el cliente los seleccionó
  const equiposInteres = body._equiposInteres ?? null;

  // Actualizar campos mergeados por separado (Prisma update)
  await prisma.trato.update({
    where: { id: trato.id },
    data: {
      ...(nombreEvento  != null && { nombreEvento }),
      ...(lugarEstimado != null && { lugarEstimado }),
      ...(fechaEvento   != null && { fechaEventoEstimada: fechaEvento }),
      ...(asistentes    != null && { asistentesEstimados: asistentes }),
      ...(presupuesto   != null && { presupuestoEstimado: presupuesto }),
      ...(horaInicio    != null && { horaInicioEvento:    horaInicio }),
      ...(horaFin       != null && { horaFinEvento:       horaFin }),
      ...(ventanaInicio != null && { ventanaMontajeInicio: ventanaInicio }),
      ...(ventanaFin    != null && { ventanaMontajeFin:   ventanaFin }),
      ...(horaTermino   != null && { horaTerminoMontaje:  horaTermino }),
      ...(venueNombre   != null && { contactoVenueNombre: venueNombre }),
      ...(venueTelefono != null && { contactoVenueTelefono: venueTelefono }),
      ...(equiposInteres != null && { equiposInteres }),
    },
  });

  return NextResponse.json({
    ok: true,
    camposActualizados: camposLlenados,
    // Devolvemos info del vendedor/responsable para que el cliente pueda
    // presionar "Avisar a mi vendedor por WhatsApp" en la pantalla de confirmación
    responsable: trato.responsable ? { name: trato.responsable.name } : null,
    clienteNombre: trato.cliente?.nombre ?? null,
  });
}
