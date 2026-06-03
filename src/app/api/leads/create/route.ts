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

  const body = await req.json().catch(() => ({}));

  // ── Normalizar campos (acepta nombres de Meta Ads o los originales) ─────────
  const nombre: string   = (body.full_name   || body.nombre        || '').trim();
  const telefono: string = (body.phone       || body.telefono      || '').trim();
  const email: string    = (body.email       || body.correo        || '').trim();
  const notaInicial: string = (body.notaInicial || body.notasIniciales || '').trim();
  const city: string     = (body.city        || '').trim();
  const campana: string  = (body.campana     || '').trim();

  if (!nombre) {
    return NextResponse.json({ error: 'full_name (o nombre) es requerido' }, { status: 400 });
  }

  // ── Validar tipoEvento ──────────────────────────────────────────────────────
  const VALID_EVENTOS = ['MUSICAL', 'SOCIAL', 'EMPRESARIAL', 'OTRO'];
  const tipoEvento = VALID_EVENTOS.includes(body.tipoEvento) ? body.tipoEvento : null;

  // ── Validar origenLead ──────────────────────────────────────────────────────
  const VALID_ORIGENES = ['META_ADS', 'GOOGLE_ADS', 'ORGANICO', 'RECOMPRA', 'REFERIDO', 'PROSPECCION', 'OTRO'];
  const origenFinal = VALID_ORIGENES.includes(body.origenLead) ? body.origenLead : 'META_ADS';

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
        tipoEvento:   tipoEvento || null,
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
