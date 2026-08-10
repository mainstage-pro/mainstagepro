import { prisma } from "@/lib/prisma";
import BaseDeDatosClient from "./BaseDeDatosClient";

export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  nombre: true,
  empresa: true,
  correo: true,
  telefono: true,
  tipoCliente: true,
  clasificacion: true,
  perfilProspecto: true,
  perfilesProspecto: true,
  esProspecto: true,
  origenLead: true,
  vendedorId: true,
  createdAt: true,
  compania: { select: { id: true, nombre: true } },
  vendedor: { select: { id: true, name: true } },
  tratos: {
    select: { id: true, etapa: true, origenLead: true, nombreEvento: true },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
  _count: { select: { tratos: true, proyectos: true, prospecciones: true, cotizaciones: true } },
};

export default async function BaseDeDatosPage() {
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [clientes, prospectos, todos, usuarios, tratosActivosMes, cotizacionesPendientesMes] = await Promise.all([
    prisma.cliente.findMany({ where: { esProspecto: false }, select: SELECT, orderBy: { createdAt: "desc" } }),
    prisma.cliente.findMany({ where: { esProspecto: true },  select: SELECT, orderBy: { createdAt: "desc" } }),
    prisma.cliente.findMany({ select: { id: true, nombre: true, telefono: true, correo: true, esProspecto: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),

    // ACTIVO: trato VENTA_CERRADA con evento o actualización en el mes actual
    prisma.trato.findMany({
      where: {
        etapa: "VENTA_CERRADA",
        OR: [
          { fechaEventoEstimada: { gte: inicioMes, lt: finMes } },
          { updatedAt: { gte: inicioMes, lt: finMes } },
        ],
      },
      select: { clienteId: true },
    }),

    // EN_PROCESO: cotización pendiente creada este mes O trato con evento este mes
    prisma.cotizacion.findMany({
      where: {
        estado: { notIn: ["APROBADA", "RECHAZADA", "VENCIDA"] },
        OR: [
          { createdAt: { gte: inicioMes, lt: finMes } },
          { trato: { fechaEventoEstimada: { gte: inicioMes, lt: finMes } } },
        ],
      },
      select: { clienteId: true },
    }),
  ]);

  // ── Detectar duplicados (sin clasificar) ─────────────────────────────────────
  const idsDuplicados = new Set<string>();
  const porTel = new Map<string, string[]>();
  for (const c of todos) {
    if (c.telefono?.trim()) {
      const key = c.telefono.replace(/\D/g, "");
      if (!porTel.has(key)) porTel.set(key, []);
      porTel.get(key)!.push(c.id);
    }
  }
  for (const ids of porTel.values()) if (ids.length > 1) ids.forEach(id => idsDuplicados.add(id));

  const porCorreo = new Map<string, string[]>();
  for (const c of todos) {
    if (c.correo?.trim()) {
      const key = c.correo.toLowerCase().trim();
      if (!porCorreo.has(key)) porCorreo.set(key, []);
      porCorreo.get(key)!.push(c.id);
    }
  }
  for (const ids of porCorreo.values()) if (ids.length > 1) ids.forEach(id => idsDuplicados.add(id));

  const sinClasificarIds = Array.from(idsDuplicados);
  const sinClasificar = sinClasificarIds.length
    ? await prisma.cliente.findMany({ where: { id: { in: sinClasificarIds } }, select: SELECT, orderBy: { nombre: "asc" } })
    : [];

  // ── actividadMap: ACTIVO > EN_PROCESO > INACTIVO ─────────────────────────────
  const activosIds = new Set(tratosActivosMes.map(t => t.clienteId).filter((id): id is string => Boolean(id)));
  const enProcesoIds = new Set(cotizacionesPendientesMes.map(c => c.clienteId).filter((id): id is string => Boolean(id)));

  const actividadMap: Record<string, "ACTIVO" | "EN_PROCESO" | "INACTIVO"> = {};
  for (const c of [...clientes, ...prospectos, ...sinClasificar]) {
    if (activosIds.has(c.id)) actividadMap[c.id] = "ACTIVO";
    else if (enProcesoIds.has(c.id)) actividadMap[c.id] = "EN_PROCESO";
    else actividadMap[c.id] = "INACTIVO";
  }

  return (
    <div className="p-4 md:p-6">
      <BaseDeDatosClient
        clientes={clientes}
        prospectos={prospectos}
        sinClasificar={sinClasificar}
        usuarios={usuarios}
        actividadMap={actividadMap}
      />
    </div>
  );
}
