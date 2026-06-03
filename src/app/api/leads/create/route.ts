import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/leads/create
 *
 * Acepta leads de Meta Ads vía Make.com (o cualquier webhook).
 *
 * Headers:
 *   x-webhook-secret: <WEBHOOK_SECRET>   (opcional si no está configurado)
 *
 * Body (JSON):
 *   full_name   | nombre        — requerido
 *   phone       | telefono      — recomendado (se usa para deduplicar)
 *   email       | correo        — opcional
 *   city                        — ciudad del prospecto (se guarda en nurturingData)
 *   tipoEvento                  — MUSICAL | SOCIAL | EMPRESARIAL | OTRO (default: OTRO)
 *   tipoProspecto               — ignorado; siempre se crea como NURTURING/LEAD
 *   origenLead                  — META_ADS | GOOGLE_ADS | ORGANICO | REFERIDO | OTRO (default: META_ADS)
 *   notaInicial | notasIniciales — descripción libre del evento / respuesta del formulario
 *   campana                     — nombre de la campaña de origen (se guarda en nurturingData)
 *
 * Respuesta éxito  (200): { success: true, tratoId, clienteId, nuevo }
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
      // Intentar JSON de todas formas (Make a veces no manda Content-Type)
      const text = await req.text();
      if (text.trim().startsWith('{')) return JSON.parse(text);
      // Intentar form-encoded
      return Object.fromEntries(new URLSearchParams(text));
    } catch { return {}; }
  })();

  // Normalizar keys del body: lowercase + espacios→guión bajo
  // Así 'full name', 'Full Name', 'full_name' todos funcionan
  const b: Record<string, string> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    const key = k.toLowerCase().replace(/\s+/g, '_');
    b[key] = String(v ?? '');
  }

  const nombre: string      = (b.full_name  || b.nombre         || '').trim();
  const telefono: string    = (b.phone      || b.telefono       || b.phone_number || '').trim();
  const email: string       = (b.email      || b.correo         || '').trim();
  const notaInicial: string = (b.notainicial || b.nota_inicial  || b.notasiniciales || '').trim();
  const city: string        = (b.city       || b.ciudad         || '').trim();
  const campana: string     = (b.campana    || b.campaign_name  || b.campaign || '').trim();
  // Para tipoEvento y origenLead usamos b directamente (ya normalizado a lowercase)
  const rawTipoEvento  = b.tipoevento  || b.tipo_evento  || b.tipoeventoevento || '';
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


  // ── Validar tipoEvento ──────────────────────────────────────────────────────
  const VALID_EVENTOS = ['MUSICAL', 'SOCIAL', 'EMPRESARIAL', 'OTRO'];
  // ── mapear tipoEvento — acepta enum exacto O texto libre del formulario ────
  function mapTipoEvento(raw: string | null | undefined): string {
    if (!raw) return 'OTRO';
    const r = raw.toLowerCase();
    // Valores exactos del enum
    if (['musical','social','empresarial','otro'].includes(r)) return r.toUpperCase();
    // Texto libre del formulario de Meta Ads
    if (r.includes('boda') || r.includes('quince') || r.includes('social') ||
        r.includes('graduaci') || r.includes('cumple') || r.includes('familiar')) return 'SOCIAL';
    if (r.includes('musical') || r.includes('concierto') || r.includes('festival') ||
        r.includes('banda') || r.includes('artista'))                              return 'MUSICAL';
    if (r.includes('empresa') || r.includes('corporat') || r.includes('conferencia') ||
        r.includes('congreso') || r.includes('lanzamiento') || r.includes('convenci')) return 'EMPRESARIAL';
    return 'OTRO';
  }
  const tipoEvento = mapTipoEvento(rawTipoEvento);

  // ── mapear origenLead — acepta enum exacto O texto libre ─────────────────────
  function mapOrigenLead(raw: string | null | undefined): string {
    if (!raw) return 'META_ADS';
    const r = raw.toLowerCase();
    const VALID = ['META_ADS','GOOGLE_ADS','ORGANICO','RECOMPRA','REFERIDO','PROSPECCION','OTRO'];
    if (VALID.includes(r.toUpperCase())) return r.toUpperCase();
    if (r.includes('meta') || r.includes('facebook') || r.includes('instagram') || r.includes('fb')) return 'META_ADS';
    if (r.includes('google'))   return 'GOOGLE_ADS';
    if (r.includes('referido') || r.includes('recomend')) return 'REFERIDO';
    if (r.includes('organico') || r.includes('orgánico') || r.includes('directo')) return 'ORGANICO';
    return 'META_ADS'; // default para leads de Meta
  }
  const origenFinal = mapOrigenLead(rawOrigenLead);

  // ── Buscar cliente existente por teléfono ────────────────────────────────────
  let clienteId: string | null = null;
  let tratoId:   string | null = null;
  let nuevo = true;

  if (telefono) {
    const existingCliente = await prisma.cliente.findFirst({
      where: { telefono },
      include: {
        tratos: {
          where: { etapa: { in: ['LEAD', 'DESCUBRIMIENTO'] }, tipoProspecto: 'NURTURING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existingCliente) {
      clienteId = existingCliente.id;
      const existingTrato = existingCliente.tratos[0];

      if (existingTrato) {
        // Ya existe trato activo → solo agregar entrada al log
        let nurturing: { etapa: string; temperatura: string; log: unknown[]; campana?: string; city?: string } =
          { etapa: 'PRIMER_CONTACTO', temperatura: 'FRIO', log: [] };
        try {
          if (existingTrato.nurturingData) {
            nurturing = JSON.parse(existingTrato.nurturingData as string);
          }
        } catch { /* ignore */ }

        nurturing.log = [
          ...(nurturing.log ?? []),
          {
            fecha: new Date().toISOString().split('T')[0],
            etapa: nurturing.etapa,
            templateId: 'webhook',
            templateLabel: `Nuevo contacto vía ${origenFinal}${campana ? ` · ${campana}` : ''}${notaInicial ? ': ' + notaInicial : ''}`,
          },
        ];
        if (campana) nurturing.campana = campana;
        if (city)    nurturing.city    = city;

        await prisma.trato.update({
          where: { id: existingTrato.id },
          data: { nurturingData: JSON.stringify(nurturing) },
        });

        tratoId = existingTrato.id;
        nuevo   = false;
      }
    }
  }

  // ── Crear cliente + trato si no se encontró ─────────────────────────────────
  if (!tratoId) {
    const cliente = clienteId
      ? { id: clienteId }
      : await prisma.cliente.create({
          data: {
            nombre,
            telefono: telefono || null,
            correo:   email    || null,
          },
        });

    const ahora = new Date();
    const fechaLabel = ahora.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

    const nurturingInit = {
      etapa:       'PRIMER_CONTACTO',
      temperatura: 'FRIO',
      log:         [] as unknown[],
      ...(campana ? { campana } : {}),
      ...(city    ? { city    } : {}),
    };

    const trato = await prisma.trato.create({
      data: {
        clienteId:    cliente.id,
        etapa:        'LEAD',
        tipoProspecto:'NURTURING',
        origenLead:   origenFinal,
        tipoEvento:   tipoEvento,
        nombreEvento: notaInicial || `Lead ${origenFinal}${campana ? ` · ${campana}` : ''} — ${fechaLabel}`,
        nurturingData:JSON.stringify(nurturingInit),
      },
    });

    tratoId  = trato.id;
    clienteId = cliente.id;
  }

  // ── Crear seguimiento de primer contacto (24h) ───────────────────────────────
  const en24h = new Date();
  en24h.setHours(en24h.getHours() + 24);

  await prisma.seguimiento.create({
    data: {
      tratoId: tratoId!,
      tipo:    'auto',
      canal:   'whatsapp',
      titulo:  `Primer contacto${campana ? ` — ${campana}` : ''}`,
      numero:  0,
      fechaProgramada: en24h,
    },
  });

  await prisma.trato.update({
    where: { id: tratoId! },
    data:  { fechaProximaAccion: en24h },
  });

  return NextResponse.json({ success: true, tratoId, clienteId, nuevo });
}
