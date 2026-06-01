// TEMPORARY ENDPOINT — DELETE AFTER USE
// Run once via: GET /api/admin/seed-areas?secret=seed2026
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "seed2026";

const UPDATES = [
  { id: "cmo7ikcc00000oqfsqwzys8g4", area: "ADMINISTRACION" }, // Emiliano
  { id: "cmo6mbjqy0001eruqem29tp7k", area: "MARKETING" },      // Sebastián
  { id: "cmnxjcynq0000aloaylskv8g6", area: "PRODUCCION" },     // Carlos
  { id: "cmo6m8jzj0000298l2oo20o1u", area: "PRODUCCION" },     // Rodrigo
  { id: "cmp3ew8mf0000v6xkmwrbuy5w", area: "PRODUCCION" },     // Zaid
  { id: "cmo6m98n80000eruqx1tk6er4", area: "DIRECCION" },      // Daniel
  { id: "cmnrpg62h0000zmizxpydetsm", area: "DIRECCION" },      // Mauricio
];

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const results = [];

  for (const u of UPDATES) {
    try {
      const user = await prisma.user.update({
        where: { id: u.id },
        data: { area: u.area },
        select: { id: true, name: true, area: true },
      });
      results.push({ ok: true, ...user });
    } catch (e) {
      results.push({ ok: false, id: u.id, error: String(e) });
    }
  }

  return NextResponse.json({
    message: "Seed completado — ELIMINA este endpoint ahora",
    results,
  });
}
