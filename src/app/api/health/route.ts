import { NextResponse } from "next/server";

// Ping de conectividad. Sin auth ni BD: solo confirma que el servidor responde.
// El cliente lo llama con HEAD (que el Service Worker NO intercepta, así que
// siempre va a la red real y nunca sirve una respuesta cacheada).
export const dynamic = "force-dynamic";

function ok() {
  return new NextResponse(null, {
    status: 200,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

export function GET() {
  return ok();
}

export function HEAD() {
  return ok();
}
