import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Ruta temporal de reparación — no requiere sesión, protegida con secret.
 * 1. Verifica qué emails del seed existen en DB
 * 2. Reasigna templates sin responsable al admin
 * 3. Regenera instancias de hoy para TODOS los templates activos
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("s");
  if (secret !== "msp-fix-2026") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const targetEmails = [
    "mauricio@mainstagepro.mx",
    "emiliano@mainstagepro.mx",
    "carlos@mainstagepro.mx",
    "rodrigo@mainstagepro.mx",
    "sebastian@mainstagepro.mx",
    "daniel@mainstagepro.mx",
    "zaid@mainstagepro.mx",
  ];

  // 1. Ver qué usuarios existen
  const usersEnDB = await prisma.user.findMany({
    where: { email: { in: targetEmails } },
    select: { id: true, email: true, name: true, role: true },
  });

  const emailsExistentes = usersEnDB.map(u => u.email);
  const emailsFaltantes = targetEmails.filter(e => !emailsExistentes.includes(e));

  // 2. Buscar el admin (Mauricio) para asignarle los templates sin responsable
  const admin = usersEnDB.find(u => u.role === "ADMIN") ?? usersEnDB[0];
  if (!admin) {
    return NextResponse.json({ error: "No hay usuario admin en DB" }, { status: 500 });
  }

  // 3. Reasignar templates con responsableId null o con email no existente al admin
  const templatesNulos = await prisma.pTTareaTemplate.updateMany({
    where: { responsableId: null },
    data: { responsableId: admin.id },
  });

  // 4. Limpiar instancias del día para regenerar fresh
  const hoy = new Date();
  const tz = "America/Mexico_City";
  const dateStr = hoy.toLocaleDateString("en-CA", { timeZone: tz });
  const inicioHoy = new Date(`${dateStr}T00:00:00.000-06:00`);
  const finHoy    = new Date(`${dateStr}T23:59:59.999-06:00`);

  await prisma.pTTareaInstancia.deleteMany({
    where: { fechaVencimiento: { gte: inicioHoy, lte: finHoy } },
  });

  // 5. Regenerar usando el motor
  const { generarInstanciasDelDia } = await import("@/lib/plan-trabajo/motor");
  const resultado = await generarInstanciasDelDia(hoy);

  return NextResponse.json({
    ok: true,
    usersEnDB: usersEnDB.map(u => ({ email: u.email, name: u.name })),
    emailsFaltantes,
    adminAsignado: admin.email,
    templatesReasignados: templatesNulos.count,
    instancias: resultado,
  });
}
