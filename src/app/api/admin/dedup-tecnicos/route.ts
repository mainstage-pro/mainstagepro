import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // 1. Fetch all técnicos ordered by createdAt (oldest first = keeper preference)
  const todos = await prisma.tecnico.findMany({
    include: {
      _count: { select: { proyectoPersonal: true, cuentasPagar: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. Group by nombre normalizado (lowercase, trim)
  const grupos = new Map<string, typeof todos>();
  for (const t of todos) {
    const key = t.nombre.trim().toLowerCase();
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(t);
  }

  let eliminados = 0;
  const detalle: { nombre: string; keeper: string; removed: string[] }[] = [];

  // 3. Process each group with more than 1 entry
  for (const [, grupo] of grupos) {
    if (grupo.length <= 1) continue;

    // Keep the one with the most relations; on tie, keep the oldest (first in array)
    const keeper = grupo.reduce((best, t) =>
      (t._count.proyectoPersonal + t._count.cuentasPagar) >
      (best._count.proyectoPersonal + best._count.cuentasPagar)
        ? t
        : best
    );
    const duplicados = grupo.filter(t => t.id !== keeper.id);

    // 4. Reassign relations from duplicates to keeper
    for (const dup of duplicados) {
      await prisma.proyectoPersonal.updateMany({
        where: { tecnicoId: dup.id },
        data: { tecnicoId: keeper.id },
      });
      await prisma.cuentaPagar.updateMany({
        where: { tecnicoId: dup.id },
        data: { tecnicoId: keeper.id },
      });
    }

    // 5. Delete duplicates
    await prisma.tecnico.deleteMany({
      where: { id: { in: duplicados.map(d => d.id) } },
    });

    eliminados += duplicados.length;
    detalle.push({
      nombre: keeper.nombre,
      keeper: keeper.id,
      removed: duplicados.map(d => d.id),
    });
  }

  return NextResponse.json({
    ok: true,
    eliminados,
    grupos: detalle.length,
    detalle,
  });
}
