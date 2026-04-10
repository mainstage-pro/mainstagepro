import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const results: Record<string, unknown> = {};

  try {
    results.proyectos_count = await prisma.proyecto.count();
  } catch (e) { results.proyectos_error = String(e); }

  try {
    results.appconfig_count = await prisma.appConfig.count();
  } catch (e) { results.appconfig_error = String(e); }

  try {
    results.moduloacceso_count = await prisma.moduloAcceso.count();
  } catch (e) { results.moduloacceso_error = String(e); }

  try {
    results.plantilla_count = await prisma.plantillaEquipo.count();
  } catch (e) { results.plantilla_error = String(e); }

  return NextResponse.json(results);
}
