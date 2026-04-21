import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const migrateSecret = process.env.ADMIN_SECRET;
  if (!migrateSecret) return NextResponse.json({ error: "No configurado" }, { status: 403 });

  const { secret, table, rows } = await req.json();
  if (secret !== migrateSecret) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    let count = 0;

    if (table === "clientes") {
      for (const r of rows) {
        await prisma.cliente.upsert({
          where: { id: r.id },
          update: {},
          create: {
            id: r.id, nombre: r.nombre, empresa: r.empresa ?? null,
            tipoCliente: r.tipoCliente ?? "POR_DESCUBRIR",
            clasificacion: r.clasificacion ?? "NUEVO",
            servicioUsual: r.servicioUsual ?? null,
            telefono: r.telefono ?? null, correo: r.correo ?? null,
            notas: r.notas ?? null,
            createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt),
          },
        });
        count++;
      }
    }

    if (table === "tecnicos") {
      for (const r of rows) {
        await prisma.tecnico.upsert({
          where: { id: r.id },
          update: {},
          create: {
            id: r.id, nombre: r.nombre, celular: r.celular ?? null,
            nivel: r.nivel ?? "A", activo: r.activo === 1 || r.activo === true,
            cuentaBancaria: r.cuentaBancaria ?? null,
            createdAt: new Date(r.createdAt),
          },
        });
        count++;
      }
    }

    if (table === "proveedores") {
      for (const r of rows) {
        await prisma.proveedor.upsert({
          where: { id: r.id },
          update: {},
          create: {
            id: r.id, nombre: r.nombre, empresa: r.empresa ?? null,
            giro: r.giro ?? null, telefono: r.telefono ?? null,
            correo: r.correo ?? null, activo: r.activo === 1 || r.activo === true,
            notas: r.notas ?? null, cuentaBancaria: r.cuentaBancaria ?? null,
            createdAt: new Date(r.createdAt),
          },
        });
        count++;
      }
    }

    if (table === "categorias") {
      await prisma.categoriaEquipo.deleteMany();
      for (const r of rows) {
        await prisma.categoriaEquipo.create({
          data: { id: r.id, nombre: r.nombre, orden: r.orden ?? 0 },
        });
        count++;
      }
    }

    if (table === "roles") {
      await prisma.rolTecnico.deleteMany();
      for (const r of rows) {
        await prisma.rolTecnico.create({
          data: {
            id: r.id, nombre: r.nombre, tipoPago: r.tipoPago,
            descripcion: r.descripcion ?? null, activo: r.activo === 1 || r.activo === true,
            orden: r.orden ?? 0,
            tarifaAAACorta: r.tarifaAAACorta ?? null, tarifaAAAMedia: r.tarifaAAAMedia ?? null, tarifaAAALarga: r.tarifaAAALarga ?? null,
            tarifaAACorta: r.tarifaAACorta ?? null,  tarifaAAMedia: r.tarifaAAMedia ?? null,  tarifaAALarga: r.tarifaAALarga ?? null,
            tarifaACorta: r.tarifaACorta ?? null,   tarifaAMedia: r.tarifaAMedia ?? null,   tarifaALarga: r.tarifaALarga ?? null,
            tarifaPlanaAAA: r.tarifaPlanaAAA ?? null, tarifaPlanaAA: r.tarifaPlanaAA ?? null, tarifaPlanaA: r.tarifaPlanaA ?? null,
            tarifaHoraAAA: r.tarifaHoraAAA ?? null,  tarifaHoraAA: r.tarifaHoraAA ?? null,  tarifaHoraA: r.tarifaHoraA ?? null,
          },
        });
        count++;
      }
    }

    if (table === "equipos") {
      await prisma.equipo.deleteMany();
      for (const r of rows) {
        await prisma.equipo.create({
          data: {
            id: r.id, categoriaId: r.categoriaId,
            subcategoria: r.subcategoria ?? null, marca: r.marca ?? null,
            modelo: r.modelo ?? null, descripcion: r.descripcion,
            cantidadTotal: r.cantidadTotal ?? 1, tipo: r.tipo ?? "PROPIO",
            precioRenta: r.precioRenta ?? 0,
            costoInternoEstimado: r.costoInternoEstimado ?? null,
            costoProveedor: r.costoProveedor ?? null,
            estado: r.estado ?? "ACTIVO", notas: r.notas ?? null,
            activo: r.activo === 1 || r.activo === true,
            createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt),
          },
        });
        count++;
      }
    }

    if (table === "users") {
      for (const r of rows) {
        const exists = await prisma.user.findFirst({ where: { email: r.email } });
        if (!exists) {
          await prisma.user.create({
            data: {
              id: r.id, name: r.name, email: r.email,
              password: r.password, role: r.role,
              active: r.active === 1 || r.active === true,
              createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt),
            },
          });
          count++;
        }
      }
    }

    return NextResponse.json({ ok: true, table, count });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
