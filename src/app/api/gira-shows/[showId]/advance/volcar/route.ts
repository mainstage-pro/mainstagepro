import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { volcarAlVenue } from "@/lib/advance-gira";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { showId } = await params;

  try {
    const r = await volcarAlVenue(showId, session.name ?? session.email);

    await logActividad(
      session.id,
      "VOLCAR_ADVANCE_VENUE",
      "GiraShow",
      showId,
      `Ficha del venue actualizada desde el advance: ${r.creadas} nuevos, ${r.actualizadas} actualizados`,
      { ...r },
    );

    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
