import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const mesStart = new Date(2026, 5, 1);
  const mesEnd   = new Date(2026, 6, 1);

  // 1. Tratos VENTA_CERRADA en junio
  const tratos = await prisma.trato.findMany({
    where: {
      etapa: "VENTA_CERRADA",
      fechaCierre: { gte: mesStart, lt: mesEnd },
    },
    select: {
      id: true,
      nombreEvento: true,
      tipoServicio: true,
      tipoEvento: true,
      fechaCierre: true,
      cliente: { select: { nombre: true, empresa: true } },
      cotizaciones: {
        where: { estado: "APROBADA" },
        select: { granTotal: true, numeroCotizacion: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      proyecto: { select: { id: true, tipoServicio: true } },
    },
    orderBy: { fechaCierre: "asc" },
  });

  console.log(`\n=== TRATOS VENTA_CERRADA JUNIO 2026: ${tratos.length} ===\n`);
  for (const t of tratos) {
    const efectivo = t.proyecto?.tipoServicio ?? t.tipoServicio ?? "NULL";
    const tieneProyecto = t.proyecto !== null;
    const tieneCotiz = t.cotizaciones.length > 0;
    console.log(`${t.fechaCierre?.toISOString().substring(0,10)} | ${(t.cliente.nombre ?? "?").substring(0,25).padEnd(25)} | servicio_efectivo=${efectivo.padEnd(20)} | trato_ts=${(t.tipoServicio??'null').padEnd(20)} | proy=${tieneProyecto?'✓':'✗'} | cotiz_aprobada=${tieneCotiz?'✓ '+t.cotizaciones[0].granTotal:'✗'}`);
  }

  // 2. Tratos que están en VENTA_CERRADA pero sin fechaCierre en junio (¿alguno?)
  console.log("\n=== VENTA_CERRADA SIN fechaCierre EN JUNIO (datos rotos) ===");
  const sinFechaCierre = await prisma.trato.findMany({
    where: { etapa: "VENTA_CERRADA", fechaCierre: null },
    select: {
      nombreEvento: true,
      cliente: { select: { nombre: true } },
      etapaCambiadaEn: true,
      createdAt: true,
    },
    take: 10,
  });
  for (const t of sinFechaCierre) console.log(`  ${t.cliente.nombre} | ${t.nombreEvento} | etapaCambiadaEn=${t.etapaCambiadaEn?.toISOString().substring(0,10)??'null'}`);
  console.log(`  Total sin fechaCierre: ${sinFechaCierre.length}`);

  // 3. Buscar Conexzion específicamente
  console.log("\n=== CONEXZION (todos los estados) ===");
  const cx = await prisma.trato.findMany({
    where: {
      OR: [
        { cliente: { nombre: { contains: "conex", mode: "insensitive" } } },
        { cliente: { empresa: { contains: "conex", mode: "insensitive" } } },
        { nombreEvento: { contains: "conex", mode: "insensitive" } },
      ],
    },
    select: {
      etapa: true,
      nombreEvento: true,
      tipoServicio: true,
      tipoEvento: true,
      fechaCierre: true,
      etapaCambiadaEn: true,
      cliente: { select: { nombre: true, empresa: true } },
      proyecto: { select: { tipoServicio: true, createdAt: true } },
      cotizaciones: { select: { estado: true, granTotal: true }, take: 5 },
    },
    orderBy: { fechaCierre: "desc" },
    take: 30,
  });

  for (const t of cx) {
    console.log(`ETAPA=${t.etapa} | cierre=${t.fechaCierre?.toISOString().substring(0,10)??'null'} | cambioEtapa=${t.etapaCambiadaEn?.toISOString().substring(0,10)??'null'} | ${t.cliente.nombre} | evento=${t.nombreEvento??'?'} | ts_trato=${t.tipoServicio??'null'} | ts_proy=${t.proyecto?.tipoServicio??'null'}`);
    for (const c of t.cotizaciones) console.log(`  cotiz ${c.estado}: $${c.granTotal}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
