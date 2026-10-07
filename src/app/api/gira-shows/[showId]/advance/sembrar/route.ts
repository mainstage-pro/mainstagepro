import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { DISCIPLINAS } from "@/lib/giras";
import { sembrarAdvance } from "@/lib/advance-gira";

export async function POST(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { showId } = await params;

  // Se siembra un departamento a la vez: se cierra audio completo antes de abrir
  // luces, y bajar el rider entero de golpe deja una lista que nadie recorre.
  const body = await req.json().catch(() => ({}));
  const disciplina =
    typeof body.disciplina === "string" && (DISCIPLINAS as readonly string[]).includes(body.disciplina)
      ? body.disciplina
      : undefined;

  try {
    const r = await sembrarAdvance(showId, disciplina);
    if (!r.riderNombre) {
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
      `Reparto sembrado desde «${r.riderNombre}»: ${r.agregados} agregados, ${r.yaRepartidos} ya estaban`,
      { ...r, disciplina: disciplina ?? "TODAS" },
    );

    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
