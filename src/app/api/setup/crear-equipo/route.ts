import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Ruta temporal — crea los 6 usuarios del equipo y reasigna las plantillas por email.
 * Protegida con secret. Eliminar después de usar.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("s");
  if (secret !== "msp-team-2026") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const password = await bcrypt.hash("Mainstage2026!", 10);

  const usuarios = [
    { email: "emiliano@mainstagepro.mx", name: "Emiliano Pérez",    area: "ADMINISTRACION" },
    { email: "sebastian@mainstagepro.mx", name: "Sebastián Pérez",  area: "MARKETING" },
    { email: "carlos@mainstagepro.mx",   name: "Carlos Luna",       area: "PRODUCCION" },
    { email: "rodrigo@mainstagepro.mx",  name: "Rodrigo Vera",      area: "PRODUCCION" },
    { email: "zaid@mainstagepro.mx",     name: "Zaid Bautista",     area: "PRODUCCION" },
    { email: "daniel@mainstagepro.mx",   name: "Daniel Guarneros",  area: "PRODUCCION" },
  ];

  const creados: string[] = [];
  const yaExistian: string[] = [];

  for (const u of usuarios) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      yaExistian.push(u.email);
      continue;
    }
    await prisma.user.create({
      data: { email: u.email, name: u.name, password, role: "USER", area: u.area, active: true },
    });
    creados.push(u.email);
  }

  // Reasignar cada template por el email almacenado en el campo responsable
  // El motor guarda responsableId, pero no responsableEmail. Sin embargo el seed
  // hace upsert buscando el user por email al momento del seed. Necesitamos
  // re-ejecutar el seed ahora que los users existen.
  const { seedPlanTrabajo } = await import("@/../prisma/seeds/run-plan-trabajo");
  const seedResult = await seedPlanTrabajo();

  // Limpiar instancias del día y regenerar
  const tz = "America/Mexico_City";
  const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const inicioHoy = new Date(`${dateStr}T00:00:00.000-06:00`);
  const finHoy    = new Date(`${dateStr}T23:59:59.999-06:00`);

  await prisma.pTTareaInstancia.deleteMany({
    where: { fechaVencimiento: { gte: inicioHoy, lte: finHoy } },
  });

  const { generarInstanciasDelDia } = await import("@/lib/plan-trabajo/motor");
  const genera = await generarInstanciasDelDia(new Date());

  return NextResponse.json({
    ok: true,
    usuariosCreados: creados,
    yaExistian,
    seed: seedResult,
    instancias: genera,
    tempPassword: "Mainstage2026!",
  });
}
