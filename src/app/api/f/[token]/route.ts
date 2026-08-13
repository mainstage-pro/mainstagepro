import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cotejarOCrearCliente } from "@/lib/cotejo-cliente";
import { ensureFormularioLeadTable, etapaDesdeMomento } from "@/lib/formulario-lead";
import { ensureProcesoVentaColumns, ensureMultidiaColumns, ensureProcesoTablas, ensureSeguimientoColumns } from "@/lib/migraciones-lazy";
import { completarDescubrimiento } from "@/lib/proceso/motor";
import { ensurePaquetesTables } from "@/lib/paquetes";

// ─── Ensure formRecibidoEn column exists ─────────────────────────────────────
let _colReady = false;
async function ensureFormRecibidoEn() {
  if (_colReady) return;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "formRecibidoEn" TIMESTAMP`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "momentoContratacion" TEXT`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "posibleDuplicado" BOOLEAN NOT NULL DEFAULT false`
    );
  } catch { /* already exists */ }
  _colReady = true;
}

// ─── Mapeo de los campos del descubrimiento (idéntico al PATCH del vendedor) ──
// Toma SOLO las claves presentes en el body y las convierte al tipo correcto.
// Reutilizado por el guardado parcial (auto-save) y el envío final del cliente.
const DISCOVERY_KEYS = [
  "tipoEvento", "subtipoEvento", "nombreEvento", "fechaEventoEstimada", "lugarEstimado",
  "asistentesEstimados", "diasServicio", "fechasEvento", "presupuestoEstimado", "tipoServicio", "notas",
  "familyAndFriends", "realizarRender", "tradeCalificado",
  "horaInicioEvento", "horaFinEvento", "duracionEvento", "duracionMontajeHrs",
  "ventanaMontajeInicio", "ventanaMontajeFin", "horaTerminoMontaje",
  "contactoVenueNombre", "contactoVenueTelefono", "contactoDecisorNombre", "contactoDecisorCargo",
  "serviciosInteres", "equiposInteres", "ideasReferencias",
  "preferenciaContacto",
  // Descubrimiento por nicho (catálogo comercial) — JSON ya serializado por el cliente.
  "nichoSlug", "respuestasDescubrimiento", "adicionalesSeleccionados",
] as const;

type RespTraza = { valor: string; origen: "vendedor" | "cliente"; ts: string };

function parseRespuestas(s: string | null | undefined): Record<string, RespTraza> {
  if (!s) return {};
  let raw: unknown;
  try { raw = JSON.parse(s); } catch { return {}; }
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, RespTraza> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") { if (v) out[k] = { valor: v, origen: "vendedor", ts: "" }; }
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const valor = String(o.valor ?? "");
      if (valor) out[k] = { valor, origen: o.origen === "cliente" ? "cliente" : "vendedor", ts: String(o.ts ?? "") };
    }
  }
  return out;
}

// Fusiona respuestas del cliente sobre las existentes SIN sobrescribir las que
// ya contestó el vendedor. Devuelve JSON string (o null si queda vacío).
function fusionarRespuestas(existenteJson: string | null | undefined, entranteJson: string): string | null {
  const existente = parseRespuestas(existenteJson);
  const entrante = parseRespuestas(entranteJson);
  const merged: Record<string, RespTraza> = { ...existente };
  for (const [k, v] of Object.entries(entrante)) {
    if (existente[k]?.origen === "vendedor") continue; // el vendedor manda
    merged[k] = v;
  }
  return Object.keys(merged).length ? JSON.stringify(merged) : null;
}

function mapDiscoveryData(body: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of DISCOVERY_KEYS) {
    if (!(key in body)) continue;
    const v = body[key];
    if (key === "fechaEventoEstimada") {
      data[key] = v ? new Date(v as string) : null;
    } else if (key === "presupuestoEstimado" || key === "duracionMontajeHrs") {
      data[key] = v !== null && v !== "" ? parseFloat(v as string) : null;
    } else if (key === "asistentesEstimados" || key === "diasServicio") {
      data[key] = v !== null && v !== "" ? parseInt(v as string) : null;
    } else if (key === "familyAndFriends" || key === "realizarRender" || key === "tradeCalificado") {
      data[key] = Boolean(v);
    } else {
      data[key] = v || null;
    }
  }
  return data;
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureFormRecibidoEn();
  await ensureProcesoVentaColumns();
  await ensureMultidiaColumns();

  const trato = await prisma.trato.findUnique({
    where: { formToken: token },
    select: {
      id: true,
      tipoServicio: true,
      tipoEvento: true,
      subtipoEvento: true,
      rutaEntrada: true,
      descubrimientoCompleto: true,
      // Campos pre-llenables / editables en el descubrimiento del cliente
      nombreEvento: true,
      fechaEventoEstimada: true,
      lugarEstimado: true,
      asistentesEstimados: true,
      diasServicio: true,
      fechasEvento: true,
      presupuestoEstimado: true,
      notas: true,
      serviciosInteres: true,
      equiposInteres: true,
      ideasReferencias: true,
      preferenciaContacto: true,
      familyAndFriends: true,
      realizarRender: true,
      tradeCalificado: true,
      horaInicioEvento: true,
      horaFinEvento: true,
      duracionMontajeHrs: true,
      ventanaMontajeInicio: true,
      ventanaMontajeFin: true,
      horaTerminoMontaje: true,
      contactoVenueNombre: true,
      contactoVenueTelefono: true,
      contactoDecisorNombre: true,
      contactoDecisorCargo: true,
      nichoSlug: true,
      respuestasDescubrimiento: true,
      adicionalesSeleccionados: true,
      formEstado: true,
      cliente: { select: { id: true, nombre: true } },
      responsable: { select: { id: true, name: true } },
    },
  });

  if (!trato) {
    // ¿Es un link huérfano (sin trato previo)?
    await ensureFormularioLeadTable();
    const formulario = await prisma.formularioLead.findUnique({ where: { token } });
    if (formulario) {
      if (formulario.usado) {
        return NextResponse.json({ completado: true });
      }
      return NextResponse.json({
        huerfano: true,
        trato: {
          id: null,
          tipoServicio: formulario.tipoServicio,
          tipoEvento: formulario.tipoEvento || "MUSICAL",
          subtipoEvento: null,
          rutaEntrada: null,
          descubrimientoCompleto: false,
          formEstado: "ENVIADO",
          cliente: { id: null, nombre: "" },
          responsable: null,
        },
      });
    }
    return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });
  }

  // Paquete presentado al cliente (si el vendedor asignó uno en equiposInteres):
  // resolvemos su ficha + adicionales sugeridos para que el cliente los seleccione.
  const paquetePresentado = await resolverPaquetePresentado(trato.equiposInteres);

  // Si ya fue completado, lo devolvemos con completado=true PERO también incluimos
  // la info del trato para que el cliente pueda verla y pueda re-enviar
  if (trato.formEstado === "COMPLETADO") {
    return NextResponse.json({ completado: true, trato, paquetePresentado });
  }

  return NextResponse.json({ trato, paquetePresentado });
}

// Extrae el primer paquete asignado en equiposInteres.paquetes y resuelve su ficha
// pública + adicionales sugeridos (para el bloque "Tu paquete" del wizard cliente).
async function resolverPaquetePresentado(equiposInteres: string | null) {
  if (!equiposInteres) return null;
  let paqueteId: string | null = null;
  try {
    const sel = JSON.parse(equiposInteres);
    const arr = Array.isArray(sel?.paquetes) ? sel.paquetes : [];
    const first = arr.find((x: { id?: string }) => x?.id);
    paqueteId = first?.id ?? null;
  } catch { return null; }
  if (!paqueteId) return null;

  await ensurePaquetesTables();
  const paq = await prisma.paquete.findFirst({
    where: { id: paqueteId, activo: true },
    select: {
      id: true, nombre: true, resumen: true, rangoPersonas: true,
      adicionalesSugeridos: true,
      imagenes: { select: { url: true, tipo: true }, orderBy: { orden: "asc" } },
    },
  });
  if (!paq) return null;

  let adicIds: string[] = [];
  try { const a = JSON.parse(paq.adicionalesSugeridos || "[]"); if (Array.isArray(a)) adicIds = a.filter((x): x is string => typeof x === "string"); }
  catch {}

  let adicionales: { id: string; nombre: string; descripcion: string | null; imagenUrl: string | null }[] = [];
  if (adicIds.length) {
    const rows = await prisma.adicional.findMany({
      where: { id: { in: adicIds }, activo: true },
      select: { id: true, nombre: true, descripcion: true, imagenUrl: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    adicionales = adicIds.map((id) => byId.get(id)).filter(Boolean) as typeof adicionales;
  }

  const portada = paq.imagenes.find((im) => im.tipo === "RENDER")?.url ?? paq.imagenes[0]?.url ?? null;
  return { id: paq.id, nombre: paq.nombre, resumen: paq.resumen, rangoPersonas: paq.rangoPersonas, portada, adicionales };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureFormRecibidoEn();
  await ensureProcesoVentaColumns();
  await ensureMultidiaColumns();
  await ensureProcesoTablas();
  await ensureSeguimientoColumns();

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
      respuestasDescubrimiento: true,
      // Para notificación al vendedor
      responsable: { select: { id: true, name: true } },
      cliente: { select: { nombre: true } },
    },
  });

  const body = await req.json();

  // ═══════════════════════════════════════════════════════════════════════════
  // Modo descubrimiento: el cliente usa el MISMO formulario que el vendedor.
  // El payload trae las claves del PATCH del vendedor (mapDiscoveryData) más
  // `_discoveryMode` y, en el envío final, `_final`.
  //  · Trato existente  → auto-guardado parcial + envío final (COMPLETADO).
  //  · Link huérfano    → solo se crea el trato en el envío final.
  // ═══════════════════════════════════════════════════════════════════════════
  if (body._discoveryMode) {
    const isFinal = Boolean(body._final);
    const data = mapDiscoveryData(body);

    if (trato) {
      // Trazabilidad: el cliente NO sobrescribe respuestas contestadas por el
      // vendedor. Se fusionan por preguntaId conservando las de origen "vendedor".
      if (typeof data.respuestasDescubrimiento === "string") {
        data.respuestasDescubrimiento = fusionarRespuestas(trato.respuestasDescubrimiento, data.respuestasDescubrimiento);
      }
      if (Object.keys(data).length > 0) {
        await prisma.trato.update({ where: { id: trato.id }, data });
      }
      if (isFinal) {
        // El cliente terminó el descubrimiento (camino 1 / FORMULARIO). El motor
        // hace la transición de subetapa; aquí solo se marca el estado del form.
        await prisma.$executeRawUnsafe(
          `UPDATE tratos SET "formEstado" = 'COMPLETADO', "formRecibidoEn" = NOW() WHERE id = $1`,
          trato.id
        );
        await completarDescubrimiento(trato.id, "FORMULARIO");
      }
      return NextResponse.json({
        ok: true,
        final: isFinal,
        responsable: trato.responsable ? { name: trato.responsable.name } : null,
        clienteNombre: trato.cliente?.nombre ?? null,
      });
    }

    // ── Link huérfano ──────────────────────────────────────────────────────
    await ensureFormularioLeadTable();
    const formulario = await prisma.formularioLead.findUnique({ where: { token } });
    if (!formulario) return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });

    if (!isFinal) {
      // Aún no hay trato donde persistir el auto-guardado; se difiere al envío final.
      return NextResponse.json({ ok: true, pendiente: true });
    }

    const nombreH = (body.nombreContacto || body.nombre || "").trim();
    const telefonoH = (body.telefonoContacto || body.telefono || body.whatsapp || "").trim();
    if (!nombreH || !telefonoH) {
      return NextResponse.json({ error: "Nombre y WhatsApp son obligatorios" }, { status: 400 });
    }

    if (formulario.usado && formulario.tratoId) {
      return NextResponse.json({ ok: true, yaConvertido: true });
    }

    const cotejo = await cotejarOCrearCliente({
      nombre: nombreH,
      telefono: telefonoH,
      correo: body.correoContacto || body.correo,
      origenLead: formulario.origenLead,
    });

    const momentoH: string | null = body.momentoContratacion || formulario.momentoSugerido || null;

    const nuevoTrato = await prisma.trato.create({
      data: {
        clienteId: cotejo.clienteId!,
        responsableId: formulario.responsableId || null,
        origenLead: formulario.origenLead,
        tipoLead: "INBOUND",
        origenVenta: "PUBLICIDAD",
        // El cliente llenó todo el descubrimiento → nace listo para cotizar.
        etapa: "OPORTUNIDAD",
        modoDescubrimiento: "FORMULARIO",
        momentoContratacion: momentoH,
        posibleDuplicado: cotejo.estado === "DUPLICADO_POSIBLE",
        rutaEntrada: "DESCUBRIR",
        formToken: token,
        formEstado: "COMPLETADO",
        descubrimientoCompleto: true,
        formRespuestas: JSON.stringify(body),
        ...data,
        // Fallbacks si el formulario no mandó tipo de servicio/evento
        tipoServicio: (data.tipoServicio as string) || formulario.tipoServicio || null,
        tipoEvento: (data.tipoEvento as string) || formulario.tipoEvento || "OTRO",
      },
      select: { id: true },
    });

    await prisma.$executeRawUnsafe(
      `UPDATE tratos SET "formRecibidoEn" = NOW() WHERE id = $1`,
      nuevoTrato.id
    );

    // Camino 1: el trato nace con descubrimiento completo → el motor lo coloca en
    // la subetapa correcta y genera su primer paso.
    await completarDescubrimiento(nuevoTrato.id, "FORMULARIO");

    await prisma.formularioLead.update({
      where: { id: formulario.id },
      data: { usado: true, tratoId: nuevoTrato.id },
    });

    return NextResponse.json({ ok: true, tratoId: nuevoTrato.id, clienteNombre: nombreH });
  }

  if (!trato) {
    // ── Link huérfano: cotejar/crear cliente y crear el trato en el pipeline ──
    await ensureFormularioLeadTable();
    const formulario = await prisma.formularioLead.findUnique({ where: { token } });
    if (!formulario) return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });

    const bodyH = body;
    const nombreH = (bodyH.nombre || bodyH.nombreContacto || "").trim();
    const telefonoH = (bodyH.telefono || bodyH.whatsapp || "").trim();
    if (!nombreH || !telefonoH) {
      return NextResponse.json({ error: "Nombre y WhatsApp son obligatorios" }, { status: 400 });
    }

    const momentoH: string | null = bodyH.momentoContratacion || formulario.momentoSugerido || null;

    // Si ya se convirtió antes, ligamos al trato existente en vez de duplicar.
    if (formulario.usado && formulario.tratoId) {
      return NextResponse.json({ ok: true, yaConvertido: true });
    }

    const cotejo = await cotejarOCrearCliente({
      nombre: nombreH,
      telefono: telefonoH,
      correo: bodyH.correo,
      origenLead: formulario.origenLead,
    });

    const nuevoTrato = await prisma.trato.create({
      data: {
        clienteId: cotejo.clienteId!,
        responsableId: formulario.responsableId || null,
        origenLead: formulario.origenLead,
        tipoLead: "INBOUND",
        origenVenta: "PUBLICIDAD",
        etapa: etapaDesdeMomento(momentoH),
        momentoContratacion: momentoH,
        posibleDuplicado: cotejo.estado === "DUPLICADO_POSIBLE",
        tipoServicio: formulario.tipoServicio || null,
        tipoEvento: formulario.tipoEvento || "OTRO",
        rutaEntrada: "DESCUBRIR",
        formToken: token,
        formEstado: "COMPLETADO",
        descubrimientoCompleto: true,
        formRespuestas: JSON.stringify(bodyH),
        nombreEvento: bodyH.nombreEvento || null,
        lugarEstimado: bodyH.lugar || null,
        fechaEventoEstimada: bodyH.fechaEvento ? new Date(bodyH.fechaEvento) : null,
        asistentesEstimados: bodyH.asistentes ? parseInt(bodyH.asistentes) : null,
        presupuestoEstimado: bodyH.presupuesto ? parseFloat(bodyH.presupuesto) : null,
        equiposInteres: bodyH._equiposInteres ?? null,
      },
      select: { id: true },
    });

    // formRecibidoEn es columna lazy (no está en el schema Prisma) → set vía raw.
    await prisma.$executeRawUnsafe(
      `UPDATE tratos SET "formRecibidoEn" = NOW() WHERE id = $1`,
      nuevoTrato.id
    );

    // Camino 1: descubrimiento completo → el motor asigna subetapa y primer paso.
    await completarDescubrimiento(nuevoTrato.id, "FORMULARIO");

    await prisma.formularioLead.update({
      where: { id: formulario.id },
      data: { usado: true, tratoId: nuevoTrato.id },
    });

    return NextResponse.json({ ok: true, tratoId: nuevoTrato.id, clienteNombre: nombreH });
  }
  // ✅ Eliminado el bloqueo: el cliente puede re-enviar el formulario siempre

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

  // Camino 1 (FORMULARIO): el cliente completó el brief → transición vía motor.
  await completarDescubrimiento(trato.id, "FORMULARIO");

  return NextResponse.json({
    ok: true,
    camposActualizados: camposLlenados,
    // Devolvemos info del vendedor/responsable para que el cliente pueda
    // presionar "Avisar a mi vendedor por WhatsApp" en la pantalla de confirmación
    responsable: trato.responsable ? { name: trato.responsable.name } : null,
    clienteNombre: trato.cliente?.nombre ?? null,
  });
}
