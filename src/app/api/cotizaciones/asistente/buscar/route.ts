import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

// Candidato de reasignación mostrado en la previa del asistente.
interface Candidato {
  kind: "EQUIPO" | "ACCESORIO" | "ROL" | "PRODUCTO";
  equipoId: string | null;
  rolTecnicoId: string | null;
  productoId: string | null;
  descripcion: string;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  precio: number;
}

// Búsqueda libre de equipos/accesorios/roles para reasignar una línea desde la previa.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const q = typeof body?.q === "string" ? body.q.trim() : "";
  // Filtro opcional: "EQUIPO" | "ROL" | "PRODUCTO" para acotar según el tipo de la línea.
  const soloRol = body?.tipo === "ROL";
  const soloEquipo = body?.tipo === "EQUIPO";
  const soloProducto = body?.tipo === "PRODUCTO";
  if (q.length < 2) return NextResponse.json({ candidatos: [] });

  const like = q;
  const candidatos: Candidato[] = [];

  if (soloProducto) {
    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        OR: [
          { nombre: { contains: like, mode: "insensitive" } },
          { descripcion: { contains: like, mode: "insensitive" } },
        ],
      },
      select: { id: true, nombre: true, categoria: true, precioFinal: true },
      take: 14,
      orderBy: { nombre: "asc" },
    });
    for (const p of productos) {
      candidatos.push({
        kind: "PRODUCTO", equipoId: null, rolTecnicoId: null, productoId: p.id,
        descripcion: p.nombre, categoria: p.categoria ?? "Paquete", marca: null, modelo: null,
        precio: p.precioFinal || 0,
      });
    }
    // En modo productos, permite también asignar roles (personal/operadores).
    const roles = await prisma.rolTecnico.findMany({
      where: { activo: true, nombre: { contains: like, mode: "insensitive" } },
      select: { id: true, nombre: true, disciplina: true },
      take: 6,
      orderBy: { nombre: "asc" },
    });
    for (const r of roles) {
      candidatos.push({
        kind: "ROL", equipoId: null, rolTecnicoId: r.id, productoId: null,
        descripcion: r.nombre, categoria: r.disciplina ?? null, marca: null, modelo: null, precio: 0,
      });
    }
    return NextResponse.json({ candidatos });
  }

  if (!soloRol) {
    const [equipos, accesorios] = await Promise.all([
      prisma.equipo.findMany({
        where: {
          activo: true,
          OR: [
            { descripcion: { contains: like, mode: "insensitive" } },
            { marca: { contains: like, mode: "insensitive" } },
            { modelo: { contains: like, mode: "insensitive" } },
          ],
        },
        select: { id: true, descripcion: true, marca: true, modelo: true, precioRenta: true, categoria: { select: { nombre: true } } },
        take: 12,
        orderBy: { descripcion: "asc" },
      }),
      prisma.accesorio.findMany({
        where: { activo: true, nombre: { contains: like, mode: "insensitive" } },
        select: { id: true, nombre: true, precioRenta: true },
        take: 8,
        orderBy: { nombre: "asc" },
      }),
    ]);
    for (const e of equipos) {
      candidatos.push({
        kind: "EQUIPO", equipoId: e.id, rolTecnicoId: null, productoId: null,
        descripcion: e.descripcion || [e.marca, e.modelo].filter(Boolean).join(" "),
        categoria: e.categoria?.nombre ?? null, marca: e.marca ?? null, modelo: e.modelo ?? null,
        precio: e.precioRenta || 0,
      });
    }
    for (const a of accesorios) {
      candidatos.push({
        kind: "ACCESORIO", equipoId: null, rolTecnicoId: null, productoId: null,
        descripcion: a.nombre, categoria: "Accesorios", marca: null, modelo: null,
        precio: a.precioRenta || 0,
      });
    }
  }

  if (!soloEquipo) {
    const roles = await prisma.rolTecnico.findMany({
      where: { activo: true, nombre: { contains: like, mode: "insensitive" } },
      select: { id: true, nombre: true, disciplina: true },
      take: 8,
      orderBy: { nombre: "asc" },
    });
    for (const r of roles) {
      candidatos.push({
        kind: "ROL", equipoId: null, rolTecnicoId: r.id, productoId: null,
        descripcion: r.nombre, categoria: r.disciplina ?? null, marca: null, modelo: null,
        precio: 0,
      });
    }
  }

  return NextResponse.json({ candidatos });
}
