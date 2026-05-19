import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo admins" }, { status: 403 });
  }

  // Normalizar valores legacy de tipo a los valores esperados por el sistema
  const [c1, c2, c3, c4, c5, c6] = await Promise.all([
    prisma.empresa.updateMany({ where: { tipo: "Cliente" },             data: { tipo: "CLIENTE" } }),
    prisma.empresa.updateMany({ where: { tipo: "Proveedor" },           data: { tipo: "PROVEEDOR" } }),
    prisma.empresa.updateMany({ where: { tipo: "Cliente y Proveedor" }, data: { tipo: "AMBOS" } }),
    prisma.empresa.updateMany({ where: { tipo: "cliente" },             data: { tipo: "CLIENTE" } }),
    prisma.empresa.updateMany({ where: { tipo: "proveedor" },           data: { tipo: "PROVEEDOR" } }),
    prisma.empresa.updateMany({ where: { tipo: "ambos" },               data: { tipo: "AMBOS" } }),
  ]);

  const total = c1.count + c2.count + c3.count + c4.count + c5.count + c6.count;
  return NextResponse.json({ ok: true, actualizadas: total });
}
