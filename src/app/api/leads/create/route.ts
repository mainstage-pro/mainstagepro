import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cotejarOCrearCliente } from '@/lib/cotejo-cliente';

/**
 * POST /api/leads/create
 *
 * Acepta leads de Meta Ads vía Make.com (o cualquier webhook externo).
 * Crea un Cliente (Prospecto) + una Prospeccion (ruta de 5 contactos).
 * NO crea un Trato — los tratos solo se crean cuando hay una cotización activa.
 *
 * Headers:
 *   x-webhook-secret: <WEBHOOK_SECRET>   (opcional si no está configurado)
 *
 * Body (JSON):
 *   full_name   | nombre        — requerido
 *   phone       | telefono      — recomendado (se usa para deduplicar)
 *   email       | correo        — opcional
 *   city                        — ciudad del prospecto
 *   tipoEvento                  — MUSICAL | SOCIAL | EMPRESARIAL | VARIOS (default: VARIOS)
 *   origenLead                  — META_ADS | GOOGLE_ADS | ORGANICO | REFERIDO | OTRO (default: META_ADS)
 *   notaInicial | notasIniciales — descripción libre del evento / respuesta del formulario
 *   campana                     — nombre de la campaña de origen
 *
 * Respuesta éxito  (200): { success: true, clienteId, prospeccionId, nuevo }
 * Respuesta error  (400): { error: "mensaje" }
 * Respuesta auth   (401): { error: "No autorizado" }
 */
export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = req.headers.get('x-webhook-secret');
  if (process.env.WEBHOOK_SECRET) {
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  } else {
    console.warn('[leads/create] WEBHOOK_SECRET not configured — allowing request');
  }

  const body = await (async () => {
    const ct = req.headers.get('content-type') ?? '';
    try {
      if (ct.includes('application/json')) {
        return await req.json();
      }
      if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
        const fd = await req.formData();
        const obj: Record<string, string> = {};
        fd.forEach((v, k) => { obj[k] = String(v); });
        return obj;
      }
      const text = await req.text();
      if (text.trim().startsWith('{')) return JSON.parse(text);
      return Object.fromEntries(new URLSearchParams(text));
    } catch { return {}; }
  })();

  // Normalizar keys
  const b: Record<string, string> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    const key = k.toLowerCase().replace(/\s+/g, '_');
    b[key] = String(v ?? '');
  }

  const nombre: string      = (b.full_name  || b.nombre         || '').trim();
  const telefonoRaw: string = (b.phone || b.telefono || b.phone_number || '').trim();
  const telefono: string = telefonoRaw
    .replace(/^p:/i, '')
    .replace(/[^\d+\s\-()]/g, '')
    .trim();
  const email: string       = (b.email      || b.correo         || '').trim();
  const notaInicial: string = (b.notainicial || b.nota_inicial  || b.notasiniciales || '').trim();
  const city: string        = (b.city       || b.ciudad         || '').trim();
  const campana: string     = (b.campana    || b.campaign_name  || b.campaign || '').trim();
  const rawTipoEvento  = b.tipoevento  || b.tipo_evento  || '';
  const rawOrigenLead  = b.origenlead  || b.origen_lead  || b.origen || '';

  if (!nombre) {
    return NextResponse.json({
      error: 'full_name (o nombre) es requerido',
      debug: {
        content_type: req.headers.get('content-type'),
        fields_received: Object.keys(body),
        body_sample: JSON.stringify(body).substring(0, 200),
      },
    }, { status: 400 });
  }

  // ── Validar y mapear tipoEvento ──────────────────────────────────────────────
  function mapTipoEvento(raw: string | null | undefined): string {
    if (!raw) return 'VARIOS';
    const r = raw.toLowerCase();
    if (['musical','social','empresarial','varios'].includes(r)) return r.toUpperCase();
    if (r.includes('boda') || r.includes('quince') || r.includes('social') ||
        r.includes('graduaci') || r.includes('cumple') || r.includes('familiar')) return 'SOCIAL';
    if (r.includes('musical') || r.includes('concierto') || r.includes('festival') ||
        r.includes('banda') || r.includes('artista'))                              return 'MUSICAL';
    if (r.includes('empresa') || r.includes('corporat') || r.includes('conferencia') ||
        r.includes('congreso') || r.includes('lanzamiento') || r.includes('convenci')) return 'EMPRESARIAL';
    return 'VARIOS';
  }
  const tipoEvento = mapTipoEvento(rawTipoEvento);

  // ── Mapear origenLead ─────────────────────────────────────────────────────────
  function mapOrigenLead(raw: string | null | undefined): string {
    if (!raw) return 'META_ADS';
    const r = raw.toLowerCase();
    const VALID = ['META_ADS','GOOGLE_ADS','ORGANICO','RECOMPRA','REFERIDO','PROSPECCION','OTRO'];
    if (VALID.includes(r.toUpperCase())) return r.toUpperCase();
    if (r.includes('meta') || r.includes('facebook') || r.includes('instagram') || r.includes('fb')) return 'META_ADS';
    if (r.includes('google'))   return 'GOOGLE_ADS';
    if (r.includes('referido') || r.includes('recomend')) return 'REFERIDO';
    if (r.includes('organico') || r.includes('orgánico') || r.includes('directo')) return 'ORGANICO';
    return 'META_ADS';
  }
  const origenFinal = mapOrigenLead(rawOrigenLead);

  // Mapear origen para el modelo Prospeccion
  const mapOrigenProspeccion: Record<string, string> = {
    META_ADS: 'META_ADS',
    GOOGLE_ADS: 'ORGANICO',
    ORGANICO: 'ORGANICO',
    REFERIDO: 'REFERIDO',
    RECOMPRA: 'RECOMPRA',
    PROSPECCION: 'NETWORKING',
    OTRO: 'OTRO',
  };

  // ── Cotejar o crear cliente (helper compartido) ──────────────────────────────
  const cotejo = await cotejarOCrearCliente({
    nombre,
    telefono,
    correo: email,
    origenLead: origenFinal,
    campana,
  });
  const clienteId = cotejo.clienteId!;
  const nuevo = cotejo.estado === 'CREADO';

  // Si es cliente recién creado, adjuntar notas de contexto del lead.
  if (nuevo) {
    const notas = [
      `Lead generado vía ${origenFinal}`,
      notaInicial || null,
      city ? `Ciudad: ${city}` : null,
      campana ? `Campaña: ${campana}` : null,
    ].filter(Boolean).join('\n');
    if (notas) {
      await prisma.cliente.update({ where: { id: clienteId }, data: { notas } });
    }
  }

  // ── Crear Prospeccion si no tiene una activa ──────────────────────────────────
  const prospeccionExistente = await prisma.prospeccion.findFirst({
    where: { clienteId, estado: { in: ['ACTIVO', 'SIN_ETAPA'] } },
  });

  let prospeccionId: string | null = prospeccionExistente?.id ?? null;

  if (!prospeccionExistente) {
    const prospeccion = await prisma.prospeccion.create({
      data: {
        tipo:       'NUEVO_PROSPECTO',
        etapa:      'NUEVO_CONTACTO',
        tipoEvento,
        origen:     mapOrigenProspeccion[origenFinal] ?? 'MANUAL',
        estado:     'ACTIVO',
        notas:      [notaInicial || null, city ? `Ciudad: ${city}` : null].filter(Boolean).join('\n') || null,
        lugarEstimado: city || null,
        clienteId,
      },
    });
    prospeccionId = prospeccion.id;
  }

  return NextResponse.json({ success: true, clienteId, prospeccionId, nuevo });
}
