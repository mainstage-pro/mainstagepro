import { prisma } from "@/lib/prisma";
import BaseDeDatosClient from "./BaseDeDatosClient";

const SELECT = {
  id: true,
  nombre: true,
  empresa: true,
  correo: true,
  telefono: true,
  tipoCliente: true,
  clasificacion: true,
  servicioUsual: true,
  tiposEvento: true,
  esProspecto: true,
  origenLead: true,
  vendedorId: true,
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
  const [clientes, prospectos, todos, usuarios] = await Promise.all([
    // Clientes confirmados: esProspecto = false
    prisma.cliente.findMany({
      where: { esProspecto: false },
      select: SELECT,
      orderBy: { createdAt: "desc" },
    }),

    // Prospectos: esProspecto = true
    prisma.cliente.findMany({
      where: { esProspecto: true },
      select: SELECT,
      orderBy: { createdAt: "desc" },
    }),

    // Para detectar duplicados necesitamos todos
    prisma.cliente.findMany({
      select: { id: true, nombre: true, telefono: true, correo: true, esProspecto: true },
    }),

    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // ── Detectar duplicados ────────────────────────────────────────────────────
  // Un contacto es "sin clasificar" si:
  // 1. Su nombre+teléfono o nombre+correo coincide con otro registro, O
  // 2. esProspecto=false pero no tiene ningún trato ni proyecto ni cotización (migrado sin contexto)
  const idsDuplicados = new Set<string>();

  // Por teléfono
  const porTel = new Map<string, string[]>();
  for (const c of todos) {
    if (c.telefono?.trim()) {
      const key = c.telefono.replace(/\D/g, "");
      if (!porTel.has(key)) porTel.set(key, []);
      porTel.get(key)!.push(c.id);
    }
  }
  for (const ids of porTel.values()) {
    if (ids.length > 1) ids.forEach((id) => idsDuplicados.add(id));
  }

  // Por correo
  const porCorreo = new Map<string, string[]>();
  for (const c of todos) {
    if (c.correo?.trim()) {
      const key = c.correo.toLowerCase().trim();
      if (!porCorreo.has(key)) porCorreo.set(key, []);
      porCorreo.get(key)!.push(c.id);
    }
  }
  for (const ids of porCorreo.values()) {
    if (ids.length > 1) ids.forEach((id) => idsDuplicados.add(id));
  }

  // Buscar los duplicados completos (con SELECT completo)
  const sinClasificarIds = Array.from(idsDuplicados);
  const sinClasificar = sinClasificarIds.length
    ? await prisma.cliente.findMany({
        where: { id: { in: sinClasificarIds } },
        select: SELECT,
        orderBy: { nombre: "asc" },
      })
    : [];

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <BaseDeDatosClient
        clientes={clientes}
        prospectos={prospectos}
        sinClasificar={sinClasificar}
        usuarios={usuarios}
      />
    </div>
  );
}
