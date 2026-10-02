import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { precargarDesdeVenue } from "@/lib/advance-gira";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { showId } = await params;

  try {
    return NextResponse.json(await precargarDesdeVenue(showId));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
