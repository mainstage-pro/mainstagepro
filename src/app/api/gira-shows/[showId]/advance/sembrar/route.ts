import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { sembrarAdvance } from "@/lib/advance-gira";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { showId } = await params;

  try {
    const r = await sembrarAdvance(showId);
    if (!r.riderId) {
      return NextResponse.json(
        { error: "La gira no tiene rider maestro asignado y el artista no tiene rider activo." },
        { status: 400 },
      );
    }

    await logActividad(
      session.id,
      "SEMBRAR_ADVANCE",
      "GiraShow",
      showId,
      `Advance sembrado desde «${r.riderNombre}»: ${r.agregadas} agregados, ${r.existentes} ya estaban`,
      { ...r },
    );

    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
