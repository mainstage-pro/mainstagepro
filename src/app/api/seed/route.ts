import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST() {
  try {
    // Verificar si ya hay usuarios
    const existingUser = await prisma.user.findFirst();
    if (existingUser) {
      return NextResponse.json({ message: "Ya inicializado" }, { status: 200 });
    }

    // Crear usuario administrador
    const hashedPassword = await hashPassword("mainstage2026");
    await prisma.user.create({
      data: {
        name: "Mauricio Hernández",
        email: "mauricio@mainstagepro.mx",
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    // Crear categorías de equipos
    const categorias = [
      "Equipo de Audio",
      "Sistemas de Microfonía",
      "Monitoreo In-Ear",
      "Consolas de Audio",
      "Equipo de Iluminación",
      "Consolas de Iluminación",
      "Rigging y Estructuras",
      "Consolas/Equipo para DJ",
      "Pantalla / Video",
      "DJ Booths",
      "Entarimado",
      "Corriente Eléctrica",
      "Equipos Externos",
    ];

    for (let i = 0; i < categorias.length; i++) {
      await prisma.categoriaEquipo.create({
        data: { nombre: categorias[i], orden: i },
      });
    }

    // Crear roles técnicos con tabulador completo
    const roles = [
      {
        nombre: "Production Manager",
        tipoPago: "POR_PROYECTO",
        tarifaPlanaAAA: 7000,
        tarifaPlanaAA: 5000,
        tarifaPlanaA: 3000,
        orden: 1,
      },
      {
        nombre: "Coordinador de Eventos",
        tipoPago: "POR_PROYECTO",
        tarifaPlanaAAA: 4000,
        tarifaPlanaAA: 3000,
        tarifaPlanaA: 2000,
        orden: 2,
      },
      {
        nombre: "Supervisor de Eventos",
        tipoPago: "POR_PROYECTO",
        tarifaPlanaAAA: 2000,
        tarifaPlanaAA: 1500,
        tarifaPlanaA: 1000,
        orden: 3,
      },
      {
        nombre: "Técnico Responsable",
        tipoPago: "TARIFA_PLANA",
        tarifaPlanaAAA: 500,
        tarifaPlanaAA: 500,
        tarifaPlanaA: 500,
        orden: 4,
      },
      {
        nombre: "Operador de Audio",
        tipoPago: "POR_JORNADA",
        tarifaAAACorta: 2500, tarifaAAAMedia: 2800, tarifaAAALarga: 3200,
        tarifaAACorta: 2000, tarifaAAMedia: 2300, tarifaAALarga: 2600,
        tarifaACorta: 1500, tarifaAMedia: 1800, tarifaALarga: 2000,
        orden: 5,
      },
      {
        nombre: "Operador de Iluminación",
        tipoPago: "POR_JORNADA",
        tarifaAAACorta: 2500, tarifaAAAMedia: 2800, tarifaAAALarga: 3200,
        tarifaAACorta: 2000, tarifaAAMedia: 2300, tarifaAALarga: 2600,
        tarifaACorta: 1500, tarifaAMedia: 1800, tarifaALarga: 2000,
        orden: 6,
      },
      {
        nombre: "Operador de Video",
        tipoPago: "POR_JORNADA",
        tarifaAAACorta: 2500, tarifaAAAMedia: 2800, tarifaAAALarga: 3200,
        tarifaAACorta: 2000, tarifaAAMedia: 2300, tarifaAALarga: 2600,
        tarifaACorta: 1500, tarifaAMedia: 1800, tarifaALarga: 2000,
        orden: 7,
      },
      {
        nombre: "Rigger",
        tipoPago: "POR_PROYECTO",
        tarifaPlanaAAA: 2000,
        tarifaPlanaAA: 2000,
        tarifaPlanaA: 2000,
        orden: 8,
      },
      {
        nombre: "Técnico de Energía",
        tipoPago: "TARIFA_PLANA",
        tarifaPlanaAAA: 1500,
        tarifaPlanaAA: 1000,
        tarifaPlanaA: 500,
        orden: 9,
      },
      {
        nombre: "Stagehand",
        tipoPago: "POR_JORNADA",
        tarifaAAACorta: 1200, tarifaAAAMedia: 1500, tarifaAAALarga: 1800,
        tarifaAACorta: 1000, tarifaAAMedia: 1200, tarifaAALarga: 1500,
        tarifaACorta: 800, tarifaAMedia: 1000, tarifaALarga: 1200,
        orden: 10,
      },
      {
        nombre: "Técnico de Montaje",
        tipoPago: "TARIFA_PLANA",
        tarifaPlanaAAA: 1200,
        tarifaPlanaAA: 800,
        tarifaPlanaA: 300,
        orden: 11,
      },
      {
        nombre: "DJ",
        tipoPago: "POR_HORA",
        tarifaHoraAAA: 500,
        tarifaHoraAA: 400,
        tarifaHoraA: 300,
        orden: 12,
      },
    ];

    for (const rol of roles) {
      await prisma.rolTecnico.create({ data: rol });
    }

    // Crear cuentas bancarias
    await prisma.cuentaBancaria.createMany({
      data: [
        {
          nombre: "Efectivo",
          banco: "Caja",
          activa: true,
        },
        {
          nombre: "Banorte Persona Física",
          banco: "Banorte",
          numeroCuenta: "1314637038",
          clabe: "072680013146370385",
          titular: "Jose Mauricio Alejandro Hernández Vázquez Mellado",
          rfc: "HEVM9611179YA",
          activa: true,
        },
        {
          nombre: "Banorte Fiscal",
          banco: "Banorte",
          numeroCuenta: "1313102977",
          clabe: "072680013131029777",
          titular: "Escenario Principal Producciones",
          rfc: "EPP2502068Q8",
          activa: true,
        },
      ],
    });

    // Crear categorías financieras
    const categoriasFinancieras = [
      { nombre: "Ingreso por evento", tipo: "INGRESO" },
      { nombre: "Anticipo", tipo: "INGRESO" },
      { nombre: "Liquidación", tipo: "INGRESO" },
      { nombre: "Aportación de capital", tipo: "INGRESO" },
      { nombre: "Gastos de dirección", tipo: "GASTO" },
      { nombre: "Gastos de administración", tipo: "GASTO" },
      { nombre: "Gastos de marketing", tipo: "GASTO" },
      { nombre: "Gastos de ventas", tipo: "GASTO" },
      { nombre: "Gastos de producción", tipo: "GASTO" },
      { nombre: "Catering oficina", tipo: "GASTO" },
      { nombre: "Servicios oficina", tipo: "GASTO" },
      { nombre: "Mantenimiento de equipos", tipo: "GASTO" },
      { nombre: "Personal freelance", tipo: "GASTO" },
      { nombre: "Viáticos", tipo: "GASTO" },
      { nombre: "Transporte y logística", tipo: "GASTO" },
      { nombre: "Proveedor externo", tipo: "GASTO" },
      { nombre: "Comisiones a vendedores", tipo: "GASTO" },
      { nombre: "Gasto personal Mauricio", tipo: "GASTO" },
      { nombre: "Gasto fijo", tipo: "GASTO" },
      { nombre: "Costo financiero", tipo: "GASTO" },
      { nombre: "Inversión en equipo", tipo: "INVERSION" },
      { nombre: "Retiro de utilidades", tipo: "RETIRO" },
    ];

    for (let i = 0; i < categoriasFinancieras.length; i++) {
      await prisma.categoriaFinanciera.create({
        data: { ...categoriasFinancieras[i], orden: i },
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Sistema inicializado correctamente",
      credenciales: {
        email: "mauricio@mainstagepro.mx",
        password: "mainstage2026",
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
