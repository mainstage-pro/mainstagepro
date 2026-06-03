import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/leads/debug
 * Endpoint temporal de diagnóstico — muestra exactamente lo que recibe.
 * BORRAR después de depurar.
 */
export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') ?? 'none';
  const secret = req.headers.get('x-webhook-secret') ?? 'not-sent';

  let body: unknown = null;
  let rawText = '';
  try {
    rawText = await req.text();
    body = JSON.parse(rawText);
  } catch {
    body = rawText;
  }

  return NextResponse.json({
    received: true,
    headers: {
      content_type: ct,
      x_webhook_secret_sent: secret !== 'not-sent',
      x_webhook_secret_value: secret === 'not-sent' ? null : secret.substring(0, 4) + '****',
    },
    body_parsed: body,
    body_raw: rawText.substring(0, 500),
    body_keys: typeof body === 'object' && body !== null ? Object.keys(body) : [],
    full_name_found: typeof body === 'object' && body !== null && 'full_name' in body,
    nombre_found: typeof body === 'object' && body !== null && 'nombre' in body,
  });
}

export async function GET() {
  return NextResponse.json({ status: 'debug endpoint activo — haz un POST desde Make.com aquí' });
}
