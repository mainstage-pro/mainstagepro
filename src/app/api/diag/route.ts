import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL ?? "NO DEFINIDA";
    const urlPreview = dbUrl.length > 10 ? dbUrl.substring(0, 50) + "..." : dbUrl;

    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({
      select: { email: true, active: true, role: true },
      take: 5,
    });

    return NextResponse.json({
      ok: true,
      dbUrlPreview: urlPreview,
      userCount,
      users,
    });
  } catch (e: unknown) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      dbUrl: (process.env.DATABASE_URL ?? "NO DEFINIDA").substring(0, 50),
    }, { status: 500 });
  }
}
