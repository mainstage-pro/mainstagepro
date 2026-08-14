import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncTecnicoRoles, TECNICO_ROLES_INCLUDE, flattenTecnicoRoles } from "@/lib/tecnico-roles";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const tecnico = await prisma.tecnico.findUnique({
    where: { id },
    include: {
      rol: { select: { nombre: true } },
      ...TECNICO_ROLES_INCLUDE,
      cuentasPagar: {
        include: { proyecto: { select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true } } },
        orderBy: { createdAt: "desc" },
      },
      proyectoPersonal: {
        include: { proyecto: { select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true, estado: true } } },
        orderBy: { proyecto: { fechaEvento: "desc" } },
        take: 20,
      },
    },
  });
  if (!tecnico) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ tecnico: flattenTecnicoRoles(tecnico) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = ["nombre", "celular", "nivel", "zonaHabitual", "cuentaBancaria", "datosFiscales", "activo", "prioridad", "comentarios", "habilidades"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key] ?? null;
  }

  // Los roles (N-a-N) derivan rolId principal + disciplina[]
  if ('roles' in body) {
    const roleIds: string[] = Array.isArray(body.roles) ? body.roles : [];
    const { rolId, disciplina } = await syncTecnicoRoles(id, roleIds);
    data.rolId = rolId;
    data.disciplina = disciplina;
  }

  const tecnico = await prisma.tecnico.update({
    where: { id },
    data,
    include: { rol: { select: { id: true, nombre: true } }, ...TECNICO_ROLES_INCLUDE },
  });
  return NextResponse.json({ tecnico: flattenTecnicoRoles(tecnico) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.tecnico.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
