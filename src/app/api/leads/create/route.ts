import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  // Auth check
  const secret = req.headers.get('x-webhook-secret');
  if (process.env.WEBHOOK_SECRET) {
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  } else {
    console.warn('[leads/create] WEBHOOK_SECRET not configured — allowing request');
  }

  const body = await req.json().catch(() => ({}));
  const { nombre, telefono, email, origenLead = 'META_ADS', notasIniciales } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'nombre requerido' }, { status: 400 });
  }

  // Validate origenLead
  const VALID_ORIGENES = ['META_ADS', 'GOOGLE_ADS', 'ORGANICO', 'RECOMPRA', 'REFERIDO', 'PROSPECCION', 'OTRO'];
  const origenFinal = VALID_ORIGENES.includes(origenLead) ? origenLead : 'OTRO';

  // 1. Look for existing cliente by telefono
  let clienteId: string | null = null;
  let tratoId: string | null = null;
  let nuevo = true;

  if (telefono) {
    const existingCliente = await prisma.cliente.findFirst({
      where: { telefono },
      include: {
        tratos: {
          where: { etapa: 'DESCUBRIMIENTO', tipoProspecto: 'NURTURING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existingCliente) {
      clienteId = existingCliente.id;
      const existingTrato = existingCliente.tratos[0];

      if (existingTrato) {
        // 2. Existing active trato — add to nurturingData.log
        let nurturing: { etapa: string; temperatura: string; log: unknown[] } = { etapa: 'PRIMER_CONTACTO', temperatura: 'FRIO', log: [] };
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
            templateLabel: `Nuevo contacto vía ${origenFinal}${notasIniciales ? ': ' + notasIniciales : ''}`,
          },
        ];

        await prisma.trato.update({
          where: { id: existingTrato.id },
          data: { nurturingData: JSON.stringify(nurturing) },
        });

        tratoId = existingTrato.id;
        nuevo = false;
      }
    }
  }

  // 3. Create new cliente + trato if not found
  if (!tratoId) {
    const cliente = clienteId
      ? { id: clienteId }
      : await prisma.cliente.create({
          data: {
            nombre: nombre.trim(),
            telefono: telefono || null,
            correo: email || null,
          },
        });

    const ahora = new Date();
    const fechaLabel = ahora.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

    const trato = await prisma.trato.create({
      data: {
        clienteId: cliente.id,
        etapa: 'DESCUBRIMIENTO',
        tipoProspecto: 'NURTURING',
        origenLead: origenFinal,
        nombreEvento: notasIniciales || `Lead ${origenFinal} — ${fechaLabel}`,
        nurturingData: JSON.stringify({ etapa: 'PRIMER_CONTACTO', temperatura: 'FRIO', log: [] }),
      },
    });

    tratoId = trato.id;
    clienteId = cliente.id;
  }

  // 4. Always create seguimiento 24h after
  const en24h = new Date();
  en24h.setHours(en24h.getHours() + 24);

  await prisma.seguimiento.create({
    data: {
      tratoId: tratoId!,
      tipo: 'auto',
      canal: 'whatsapp',
      titulo: 'Primer contacto',
      numero: 0,
      fechaProgramada: en24h,
    },
  });

  await prisma.trato.update({
    where: { id: tratoId! },
    data: { fechaProximaAccion: en24h },
  });

  return NextResponse.json({ success: true, tratoId, clienteId, nuevo });
}
