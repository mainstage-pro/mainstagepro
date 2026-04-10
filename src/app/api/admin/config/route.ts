import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rows = await prisma.appConfig.findMany();
  const config = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  // body: { key: string, value: string }[] or single { key, value }
  const entries: { key: string; value: string }[] = Array.isArray(body) ? body : [body];

  for (const { key, value } of entries) {
    await prisma.appConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  return NextResponse.json({ ok: true });
}
