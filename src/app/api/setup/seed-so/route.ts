import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("s");
  if (secret !== "msp-so-2026") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { seedSistemaOperativo } = await import("@/../prisma/seeds/seed-sistema-operativo");
  const result = await seedSistemaOperativo();
  return NextResponse.json({ ok: true, ...result });
}
