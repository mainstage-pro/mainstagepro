import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { safeParseAcuerdos } from "@/lib/evaluaciones";

// Estándares del puesto del colaborador + acuerdos arrastrados del periodo anterior,
// para precargarlos al crear su evaluación.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const personalId = req.nextUrl.searchParams.get("personalId");
  if (!personalId) return NextResponse.json({ error: "personalId requerido" }, { status: 400 });

  const persona = await prisma.personalInterno.findUnique({
    where: { id: personalId },
    select: { puestoRef: { select: { nombre: true, estandares: true, responsabilidades: true } } },
  });

  // Estándares estructurados del puesto: [{ subarea, responsabilidad, estandar }].
  const criterios: { subarea: string; responsabilidad: string; estandar: string }[] = [];
  const vistos = new Set<string>();
  try {
    const v = JSON.parse(persona?.puestoRef?.estandares ?? "[]");
    if (Array.isArray(v)) {
      for (const e of v) {
        const responsabilidad = String(e?.responsabilidad ?? "");
        const estandar = String(e?.estandar ?? "");
        const subarea = String(e?.subarea ?? "");
        if (!responsabilidad && !estandar) continue;
        vistos.add((responsabilidad || estandar).toLowerCase());
        criterios.push({ subarea, responsabilidad, estandar });
      }
    }
  } catch { /* estándares inválidos */ }

  // Responsabilidades permanentes del puesto (JSON string[]) que no estén ya cubiertas
  // por un estándar, para que el vínculo con el puesto funcione aunque no haya estándares.
  try {
    const r = JSON.parse(persona?.puestoRef?.responsabilidades ?? "[]");
    if (Array.isArray(r)) {
      for (const item of r) {
        const responsabilidad = String(item ?? "").trim();
        if (!responsabilidad || vistos.has(responsabilidad.toLowerCase())) continue;
        vistos.add(responsabilidad.toLowerCase());
        criterios.push({ subarea: "", responsabilidad, estandar: "" });
      }
    }
  } catch { /* responsabilidades inválidas */ }

  // Acuerdos del periodo anterior que siguen abiertos (no cumplidos), reiniciados a
  // PENDIENTE para dar seguimiento este periodo.
  const ultima = await prisma.evaluacionEmpleado.findFirst({
    where: { personalId },
    orderBy: { createdAt: "desc" },
    select: { acuerdos: true, periodo: true },
  });
  const acuerdosPrevios = safeParseAcuerdos(ultima?.acuerdos ?? null)
    .filter((a) => a.estado !== "CUMPLIDO")
    .map((a) => ({ texto: a.texto, estado: "PENDIENTE" as const, nota: "" }));

  return NextResponse.json({
    puestoNombre: persona?.puestoRef?.nombre ?? null,
    estandares: criterios,
    acuerdosPrevios,
    periodoPrevio: ultima?.periodo ?? null,
  });
}
