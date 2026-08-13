import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { calcularJornada, calcularResumen, type LineaCotizacion } from "@/lib/cotizador";
import { cargarGlosario, resolverTerminos, type GlosarioRow } from "@/lib/glosario";
import { ensureGlosarioTabla } from "@/lib/migraciones-lazy";

export const runtime = "nodejs";
export const maxDuration = 120;

// ── Estructura que extrae la IA del texto libre ──────────────────────────────
interface ItemPedido {
  termino: string;
  cantidad: number;
}
interface Extraccion {
  clienteNombre: string | null;
  servicio: "RENTA" | "PRODUCCION_TECNICA" | "DIRECCION_TECNICA" | null;
  tipoEvento: "MUSICAL" | "SOCIAL" | "EMPRESARIAL" | "OTRO" | null;
  nombreEvento: string | null;
  fechaEvento: string | null; // YYYY-MM-DD
  lugar: string | null;
  horaInicio: string | null; // HH:MM 24h
  horaFin: string | null; // HH:MM 24h
  descuentoEquiposPct: number | null; // porcentaje 0-100
  items: ItemPedido[]; // equipos y accesorios
  roles: ItemPedido[]; // personal / operadores / servicios humanos
}

const SYSTEM = `Eres un asistente que interpreta pedidos de cotización para una empresa de producción de eventos en México.
Recibes una frase libre y devuelves ÚNICAMENTE un objeto JSON (sin markdown, sin explicación) con esta forma:
{
  "clienteNombre": string|null,
  "servicio": "RENTA"|"PRODUCCION_TECNICA"|"DIRECCION_TECNICA"|null,
  "tipoEvento": "MUSICAL"|"SOCIAL"|"EMPRESARIAL"|"OTRO"|null,
  "nombreEvento": string|null,
  "fechaEvento": "YYYY-MM-DD"|null,
  "lugar": string|null,
  "horaInicio": "HH:MM"|null,   // 24h
  "horaFin": "HH:MM"|null,      // 24h
  "descuentoEquiposPct": number|null,  // porcentaje sobre equipos, ej 15
  "items": [ { "termino": string, "cantidad": number } ],  // equipos/accesorios físicos
  "roles": [ { "termino": string, "cantidad": number } ]   // personal humano: operadores, técnicos, dj
}
Reglas:
- "termino" es la palabra clave tal cual la dijo el usuario, CONSERVANDO marca y modelo si los menciona
  (ej "bocinas electro voice ekx12p", "bajos ekx18sp", "beams", "trusses de 3 metros", "operador de audio").
  NO resumas ni quites el modelo: "ekx12p" (bocina) y "ekx18sp" (bajo/subwoofer) son equipos DISTINTOS y el
  modelo es lo que los diferencia. Si el usuario da modelo, el término DEBE incluirlo.
- Si un mismo renglón pide varios equipos distintos, crea un item por cada uno (no los mezcles en un término).
- Si no se dice cantidad, usa 1.
- Distingue por NATURALEZA: cosas físicas del inventario van en "items"; personas/servicios humanos van en "roles".
- ROLES humanos: operador de audio/video/iluminación, técnico, ingeniero de audio, stage manager, y el DJ.
  El servicio de DJ (aka "dj", "servicio de dj", "servicio técnico de dj", "cabina de dj", "tornamesas con operador")
  SIEMPRE va en "roles" con termino "dj". Nunca lo pongas en items.
- Convierte horas a 24h ("3:00 pm"→"15:00", "1:00 pm"→"13:00").
- Interpreta la fecha en el año en curso salvo que se indique otro. Español de México.
- No inventes datos: lo que no aparezca va como null (o lista vacía).
Responde SOLO el JSON.`;

function extraerJson(txt: string): unknown {
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function horasEntre(inicio: string | null, fin: string | null): number {
  if (!inicio || !fin) return 8;
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  if ([hi, mi, hf, mf].some((n) => !Number.isFinite(n))) return 8;
  let diff = hf + mf / 60 - (hi + mi / 60);
  if (diff <= 0) diff += 24; // cruza medianoche
  return Math.round(diff * 10) / 10;
}

// ── Construye las líneas de cotización a partir de la extracción resuelta ─────
interface LineaDraft extends Record<string, unknown> {
  tipo: string;
  descripcion: string;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  notas: string | null;
  cantidad: number;
  dias: number;
  precioUnitario: number;
  costoUnitario: number;
  subtotal: number;
  equipoId: string | null;
  rolTecnicoId: string | null;
  esExterno: boolean;
  revisar: boolean;
}

type EquipoRec = {
  id: string; descripcion: string; marca: string | null; modelo: string | null;
  precioRenta: number | null; costoInternoEstimado: number | null; costoProveedor: number | null;
  tipo: string; categoria: { nombre: string } | null;
};
type AccesorioRec = { id: string; nombre: string; precioRenta: number | null };
type RolRec = {
  id: string; nombre: string; disciplina: string;
  tarifaACorta: number | null; tarifaAMedia: number | null; tarifaALarga: number | null;
  tarifaAACorta: number | null; tarifaAAMedia: number | null; tarifaAALarga: number | null;
  tarifaAAACorta: number | null; tarifaAAAMedia: number | null; tarifaAAALarga: number | null;
};

const EQUIPO_SELECT = { id: true, descripcion: true, marca: true, modelo: true, precioRenta: true, costoInternoEstimado: true, costoProveedor: true, tipo: true, categoria: { select: { nombre: true } } } as const;
const ACCESORIO_SELECT = { id: true, nombre: true, precioRenta: true } as const;
const ROL_SELECT = {
  id: true, nombre: true, disciplina: true,
  tarifaACorta: true, tarifaAMedia: true, tarifaALarga: true,
  tarifaAACorta: true, tarifaAAMedia: true, tarifaAALarga: true,
  tarifaAAACorta: true, tarifaAAAMedia: true, tarifaAAALarga: true,
} as const;

function tarifaDe(r: RolRec, jornada: string): number {
  const j = jornada === "CORTA" ? "Corta" : jornada === "MEDIA" ? "Media" : "Larga";
  const candidatos = [r[`tarifaA${j}` as keyof RolRec], r[`tarifaAA${j}` as keyof RolRec], r[`tarifaAAA${j}` as keyof RolRec]];
  const val = candidatos.find((v) => typeof v === "number" && v > 0);
  return typeof val === "number" ? val : 0;
}

function lineaEquipo(e: EquipoRec, cant: number, dias: number): LineaDraft {
  const esExterno = e.tipo === "EXTERNO";
  const precio = e.precioRenta || 0;
  const costo = e.costoInternoEstimado ?? e.costoProveedor ?? 0;
  const cat = e.categoria?.nombre ?? null;
  const desc = e.descripcion || [e.marca, e.modelo].filter(Boolean).join(" ");
  return {
    tipo: esExterno ? "EQUIPO_EXTERNO" : "EQUIPO_PROPIO",
    descripcion: desc, categoria: cat, marca: e.marca ?? null, modelo: e.modelo ?? null,
    notas: cat ? `cat:${cat}` : null,
    cantidad: cant, dias, precioUnitario: precio, costoUnitario: costo, subtotal: precio * cant * dias,
    equipoId: e.id, rolTecnicoId: null, esExterno, revisar: false,
  };
}

function lineaAccesorio(a: AccesorioRec, cant: number, dias: number): LineaDraft {
  const precio = a.precioRenta || 0;
  return {
    tipo: "EQUIPO_PROPIO", descripcion: a.nombre, categoria: "Accesorios", marca: null, modelo: null,
    notas: "cat:Accesorios",
    cantidad: cant, dias, precioUnitario: precio, costoUnitario: 0, subtotal: precio * cant * dias,
    equipoId: null, rolTecnicoId: null, esExterno: false, revisar: false,
  };
}

function lineaRol(r: RolRec, cant: number, dias: number, jornada: string): LineaDraft {
  const precio = tarifaDe(r, jornada);
  const tipo = r.disciplina === "DJ" ? "DJ" : "OPERACION_TECNICA";
  return {
    tipo, descripcion: r.nombre, categoria: null, marca: null, modelo: null, notas: null,
    cantidad: cant, dias, precioUnitario: precio, costoUnitario: 0, subtotal: precio * cant * dias,
    equipoId: null, rolTecnicoId: r.id, esExterno: false, revisar: precio === 0,
  };
}

function lineaOtro(termino: string, cant: number, dias: number): LineaDraft {
  return {
    tipo: "OTRO", descripcion: termino, categoria: null, marca: null, modelo: null, notas: null,
    cantidad: cant, dias, precioUnitario: 0, costoUnitario: 0, subtotal: 0,
    equipoId: null, rolTecnicoId: null, esExterno: false, revisar: true,
  };
}

async function cargarCatalogo(equipoIds: Set<string>, accesorioIds: Set<string>, rolIds: Set<string>) {
  const [equipos, accesorios, roles] = await Promise.all([
    prisma.equipo.findMany({ where: { id: { in: [...equipoIds] } }, select: EQUIPO_SELECT }),
    prisma.accesorio.findMany({ where: { id: { in: [...accesorioIds] } }, select: ACCESORIO_SELECT }),
    prisma.rolTecnico.findMany({ where: { id: { in: [...rolIds] } }, select: ROL_SELECT }),
  ]);
  return {
    eqMap: new Map(equipos.map((e) => [e.id, e as EquipoRec])),
    acMap: new Map(accesorios.map((a) => [a.id, a as AccesorioRec])),
    rlMap: new Map(roles.map((r) => [r.id, r as RolRec])),
  };
}

async function armarLineas(
  extra: Extraccion,
  glosario: GlosarioRow[],
  dias: number,
  horas: number
): Promise<{ lineas: LineaDraft[]; noResueltos: string[] }> {
  const noResueltos: string[] = [];
  const lineas: LineaDraft[] = [];
  const jornada = calcularJornada(horas);

  // Fusiona items y roles: el TIPO real lo decide el glosario, no en qué lista lo puso la IA.
  // Así un "dj" que la IA mande a items (o al revés) igual se rutea como rol técnico.
  const pedidos = [
    ...extra.items.map((i) => ({ termino: i.termino, cantidad: i.cantidad })),
    ...extra.roles.map((r) => ({ termino: r.termino, cantidad: r.cantidad })),
  ];
  const resueltos = resolverTerminos(pedidos.map((p) => p.termino), glosario);

  const equipoIds = new Set<string>();
  const accesorioIds = new Set<string>();
  const rolIds = new Set<string>();
  for (const r of resueltos) {
    if (!r.match) continue;
    if (r.match.tipoObjetivo === "EQUIPO") equipoIds.add(r.match.objetivoId);
    else if (r.match.tipoObjetivo === "ACCESORIO") accesorioIds.add(r.match.objetivoId);
    else rolIds.add(r.match.objetivoId);
  }
  const { eqMap, acMap, rlMap } = await cargarCatalogo(equipoIds, accesorioIds, rolIds);

  pedidos.forEach((pedido, idx) => {
    const match = resueltos[idx]?.match;
    const cant = Math.max(1, Math.round(pedido.cantidad || 1));
    if (!match) {
      noResueltos.push(pedido.termino);
      lineas.push(lineaOtro(pedido.termino, cant, dias));
      return;
    }
    if (match.tipoObjetivo === "EQUIPO") {
      const e = eqMap.get(match.objetivoId);
      if (e) lineas.push(lineaEquipo(e, cant, dias));
    } else if (match.tipoObjetivo === "ACCESORIO") {
      const a = acMap.get(match.objetivoId);
      if (a) lineas.push(lineaAccesorio(a, cant, dias));
    } else {
      const r = rlMap.get(match.objetivoId);
      if (r) lineas.push(lineaRol(r, cant, dias, jornada));
    }
  });

  return { lineas, noResueltos: [...new Set(noResueltos)] };
}

// ── Reconstruye las líneas a partir de la previa editada (reasignación) ───────
// Cada línea entra con {equipoId|rolTecnicoId|null, cantidad, descripcion}; el
// precio/costo/categoría se re-hidrata desde la BD para que reasignar sea fiel.
interface LineaEditada {
  tipo?: string;
  descripcion?: string;
  cantidad?: number;
  equipoId?: string | null;
  rolTecnicoId?: string | null;
}

async function hidratarLineas(
  editadas: LineaEditada[],
  dias: number,
  horas: number
): Promise<LineaDraft[]> {
  const jornada = calcularJornada(horas);
  const equipoIds = new Set<string>();
  const rolIds = new Set<string>();
  for (const l of editadas) {
    if (l.equipoId) equipoIds.add(l.equipoId);
    if (l.rolTecnicoId) rolIds.add(l.rolTecnicoId);
  }
  const { eqMap, rlMap } = await cargarCatalogo(equipoIds, new Set(), rolIds);

  const lineas: LineaDraft[] = [];
  for (const l of editadas) {
    const cant = Math.max(1, Math.round(l.cantidad || 1));
    if (l.equipoId && eqMap.has(l.equipoId)) {
      lineas.push(lineaEquipo(eqMap.get(l.equipoId)!, cant, dias));
    } else if (l.rolTecnicoId && rlMap.has(l.rolTecnicoId)) {
      lineas.push(lineaRol(rlMap.get(l.rolTecnicoId)!, cant, dias, jornada));
    } else {
      lineas.push(lineaOtro(l.descripcion || "Sin resolver", cant, dias));
    }
  }
  return lineas;
}

async function interpretar(texto: string): Promise<Extraccion | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  const hoy = new Date().toISOString().slice(0, 10);
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM,
    messages: [{ role: "user", content: `Hoy es ${hoy}. Pedido: "${texto}"` }],
  });
  const raw = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  const parsed = extraerJson(raw) as Partial<Extraccion> | null;
  if (!parsed) return null;
  return normalizarExtra(parsed);
}

function normalizarExtra(parsed: Partial<Extraccion>): Extraccion {
  return {
    clienteNombre: parsed.clienteNombre ?? null,
    servicio: parsed.servicio ?? null,
    tipoEvento: parsed.tipoEvento ?? null,
    nombreEvento: parsed.nombreEvento ?? null,
    fechaEvento: parsed.fechaEvento ?? null,
    lugar: parsed.lugar ?? null,
    horaInicio: parsed.horaInicio ?? null,
    horaFin: parsed.horaFin ?? null,
    descuentoEquiposPct: typeof parsed.descuentoEquiposPct === "number" ? parsed.descuentoEquiposPct : null,
    items: Array.isArray(parsed.items) ? parsed.items.filter((i) => i && typeof i.termino === "string") : [],
    roles: Array.isArray(parsed.roles) ? parsed.roles.filter((i) => i && typeof i.termino === "string") : [],
  };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureGlosarioTabla();

  const body = await req.json().catch(() => ({}));
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  const crear = body?.crear === true;
  // Reasignación: el frontend puede reenviar las líneas ya editadas (equipo/rol reasignado,
  // cantidades ajustadas) junto con la extracción original — tanto al recalcular la previa
  // como al crear. Si vienen líneas, se re-hidratan desde la BD para respetar la reasignación.
  const lineasEditadas = Array.isArray(body?.lineas) ? (body.lineas as LineaEditada[]) : null;
  const clienteIdSel = typeof body?.clienteId === "string" ? body.clienteId : null;

  // La extracción viene reenviada por el frontend (para no re-llamar a la IA) o se interpreta del texto.
  let extra: Extraccion | null = null;
  if (lineasEditadas && body?.extraido && typeof body.extraido === "object") {
    extra = normalizarExtra(body.extraido as Partial<Extraccion>);
  } else {
    if (!texto) return NextResponse.json({ error: "Falta el texto del pedido" }, { status: 400 });
    extra = await interpretar(texto);
    if (!extra) return NextResponse.json({ error: "No pude interpretar el pedido (¿IA configurada?)." }, { status: 422 });
  }

  const horas = horasEntre(extra.horaInicio, extra.horaFin);
  const dias = 1;

  let lineas: LineaDraft[];
  let noResueltos: string[];
  if (lineasEditadas) {
    lineas = await hidratarLineas(lineasEditadas, dias, horas);
    noResueltos = lineas.filter((l) => l.revisar).map((l) => l.descripcion);
  } else {
    const glosario = await cargarGlosario();
    ({ lineas, noResueltos } = await armarLineas(extra, glosario, dias, horas));
  }

  // Cliente: por id seleccionado en la previa, o cotejo por nombre (no crea salvo que se confirme).
  let cliente = clienteIdSel
    ? await prisma.cliente.findUnique({ where: { id: clienteIdSel }, select: { id: true, nombre: true, tipoCliente: true } })
    : extra.clienteNombre
    ? await prisma.cliente.findFirst({
        where: { nombre: { equals: extra.clienteNombre, mode: "insensitive" } },
        select: { id: true, nombre: true, tipoCliente: true },
      })
    : null;

  const descuentoEspecialPct = extra.descuentoEquiposPct ? extra.descuentoEquiposPct / 100 : 0;
  const resumen = calcularResumen({
    lineas: lineas as unknown as LineaCotizacion[],
    tipoCliente: cliente?.tipoCliente ?? "POR_DESCUBRIR",
    diasEquipo: dias,
    descuentoPatrocinioPct: 0,
    descuentoEspecialPct,
    aplicaIva: false,
  });

  // ── Modo análisis: devuelve el borrador para revisión ──
  if (!crear) {
    return NextResponse.json({
      extraido: extra,
      horas,
      jornada: calcularJornada(horas),
      cliente: { match: cliente, nombre: extra.clienteNombre },
      lineas,
      noResueltos,
      descuentoEspecialPct,
      resumen,
    });
  }

  // ── Modo crear: persiste cliente (si falta) + cotización ──
  if (!cliente && extra.clienteNombre) {
    const nuevo = await prisma.cliente.create({
      data: { nombre: extra.clienteNombre, tipoCliente: "POR_DESCUBRIR", vendedorId: session.id },
      select: { id: true, nombre: true, tipoCliente: true },
    });
    cliente = nuevo;
  }
  if (!cliente) return NextResponse.json({ error: "Falta el nombre del cliente para crear la cotización." }, { status: 400 });

  const last = await prisma.cotizacion.findFirst({ orderBy: { numeroCotizacion: "desc" }, select: { numeroCotizacion: true } });
  const lastNum = last ? parseInt(last.numeroCotizacion.replace("COT-", "")) || 0 : 0;
  const numeroCotizacion = `COT-${String(lastNum + 1).padStart(4, "0")}`;

  const cotizacion = await prisma.cotizacion.create({
    data: {
      numeroCotizacion,
      clienteId: cliente.id,
      creadaPorId: session.id,
      descuentoEspecialPct,
      descuentoEspecialNota: extra.descuentoEquiposPct ? `Asistente IA: ${extra.descuentoEquiposPct}% sobre equipos` : null,
      aplicaIva: false,
      nombreEvento: extra.nombreEvento,
      tipoEvento: extra.tipoEvento,
      tipoServicio: extra.servicio,
      fechaEvento: extra.fechaEvento ? new Date(extra.fechaEvento) : null,
      lugarEvento: extra.lugar,
      horasOperacion: horas,
      tipoJornada: calcularJornada(horas),
      diasEquipo: dias,
      diasOperacion: dias,
      subtotalEquiposBruto: resumen.subtotalEquiposBruto,
      descuentoVolumenPct: resumen.descuentoVolumenPct,
      descuentoB2bPct: resumen.descuentoB2bPct,
      descuentoMultidiaPct: resumen.descuentoMultidiaPct,
      descuentoTotalPct: resumen.descuentoTotalPct,
      montoDescuento: resumen.montoDescuento,
      subtotalEquiposNeto: resumen.subtotalEquiposNeto,
      subtotalOperacion: resumen.subtotalOperacion,
      total: resumen.total,
      montoIva: resumen.montoIva,
      granTotal: resumen.granTotal,
      costosTotalesEstimados: resumen.costosTotalesEstimados,
      utilidadEstimada: resumen.utilidadEstimada,
      porcentajeUtilidad: resumen.porcentajeUtilidad,
      fechaVencimiento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      lineas: {
        create: lineas.map((l, i) => ({
          tipo: l.tipo,
          orden: i,
          equipoId: l.equipoId,
          rolTecnicoId: l.rolTecnicoId,
          descripcion: l.descripcion,
          marca: l.marca,
          modelo: l.modelo,
          notas: l.notas,
          jornada: l.rolTecnicoId ? calcularJornada(horas) : null,
          esExterno: l.esExterno,
          cantidad: l.cantidad,
          dias: l.dias,
          precioUnitario: l.precioUnitario,
          costoUnitario: l.costoUnitario,
          subtotal: l.subtotal,
        })),
      },
    },
    select: { id: true, numeroCotizacion: true },
  });

  await logActividad(session.id, "CREAR", "cotizacion", cotizacion.id, `Cotización ${numeroCotizacion} creada con asistente IA`);

  return NextResponse.json({ ok: true, cotizacionId: cotizacion.id, numeroCotizacion: cotizacion.numeroCotizacion, noResueltos });
}
