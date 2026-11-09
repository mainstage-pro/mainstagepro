import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncTecnicoRoles, TECNICO_ROLES_INCLUDE, flattenTecnicoRoles } from "@/lib/tecnico-roles";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tecnicos = await prisma.tecnico.findMany({
    include: {
      rol: { select: { id: true, nombre: true, perfil: true, tarifaPendiente: true } },
      ...TECNICO_ROLES_INCLUDE,
    },
    orderBy: { nombre: "asc" },
  });

  // Origen (Formulario/Manual): Postulacion.tecnicoId no tiene relación Prisma hacia
  // Tecnico (es un vínculo suelto de Fase 2), así que se resuelve con una query aparte.
  const postulaciones = await prisma.postulacion.findMany({
    where: { tecnicoId: { in: tecnicos.map((t) => t.id) } },
    select: { id: true, tecnicoId: true, origen: true, candidatoId: true },
  });
  const mapaOrigen = new Map(postulaciones.map((p) => [p.tecnicoId!, p]));

  return NextResponse.json({
    tecnicos: tecnicos.map((t) => {
      const post = mapaOrigen.get(t.id);
      return {
        ...flattenTecnicoRoles(t),
        origen: post?.origen ?? null,
        postulacionCandidatoId: post?.candidatoId ?? null,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { nombre, celular, roles, nivel, zonaHabitual, banco, titularCuenta, cuentaBancaria, clabe, noTarjeta, datosFiscales, comentarios, habilidades } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const roleIds: string[] = Array.isArray(roles) ? roles : [];

  const tecnico = await prisma.tecnico.create({
    data: {
      nombre,
      celular: celular || null,
      nivel: nivel || "A",
      zonaHabitual: zonaHabitual || null,
      banco: banco || null,
      titularCuenta: titularCuenta || null,
      cuentaBancaria: cuentaBancaria || null,
      clabe: clabe || null,
      noTarjeta: noTarjeta || null,
      datosFiscales: datosFiscales || null,
      comentarios: comentarios || null,
      habilidades: habilidades || null,
    },
  });

  const { rolId, disciplina } = await syncTecnicoRoles(tecnico.id, roleIds);
  await prisma.tecnico.update({ where: { id: tecnico.id }, data: { rolId, disciplina } });

  const full = await prisma.tecnico.findUnique({
    where: { id: tecnico.id },
    include: { rol: { select: { id: true, nombre: true } }, ...TECNICO_ROLES_INCLUDE },
  });

  return NextResponse.json({ tecnico: full ? flattenTecnicoRoles(full) : null }, { status: 201 });
}
