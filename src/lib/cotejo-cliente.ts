import { prisma } from '@/lib/prisma';

/**
 * Cotejo de cliente para el flujo de descubrimiento unificado.
 *
 * Liga un lead a un cliente existente (por teléfono) o crea uno nuevo, sin duplicar.
 * Marca DUPLICADO_POSIBLE cuando la evidencia es ambigua (mismo teléfono con nombre muy
 * distinto, o nombre igual con teléfono distinto) para que un humano revise.
 */

export type EstadoCotejo = 'LIGADO' | 'CREADO' | 'DUPLICADO_POSIBLE';

export interface ClienteCandidato {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
}

export interface CotejoInput {
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  origenLead?: string | null;
  campana?: string | null;
}

export interface CotejoResult {
  clienteId: string | null;
  estado: EstadoCotejo;
  clienteExistente?: ClienteCandidato;
}

/** Normaliza un teléfono a solo dígitos (quita espacios, guiones, paréntesis, prefijos "p:"). */
export function normalizarTelefono(raw?: string | null): string {
  if (!raw) return '';
  return raw.replace(/^p:/i, '').replace(/\D/g, '');
}

/** Normaliza un nombre para comparación: sin acentos, minúsculas, espacios colapsados. */
export function normalizarNombre(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function nombresSimilares(a?: string | null, b?: string | null): boolean {
  const na = normalizarNombre(a);
  const nb = normalizarNombre(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = na.split(' ')[0];
  const tb = nb.split(' ')[0];
  return ta === tb && ta.length >= 3;
}

export async function cotejarOCrearCliente(input: CotejoInput): Promise<CotejoResult> {
  const nombre = (input.nombre || '').trim();
  const telefono = normalizarTelefono(input.telefono);
  const correo = (input.correo || '').trim() || null;
  const origenLead = input.origenLead || null;
  const campana = input.campana || null;

  // 1. Match exacto por teléfono (normalizando ambos lados en SQL para tolerar datos con formato).
  if (telefono) {
    const rows = await prisma.$queryRaw<Array<ClienteCandidato & { origenLead: string | null; campana: string | null }>>`
      SELECT id, nombre, telefono, correo, "origenLead", campana
      FROM clientes
      WHERE regexp_replace(coalesce(telefono, ''), '[^0-9]', '', 'g') = ${telefono}
      LIMIT 1`;
    if (rows.length > 0) {
      const c = rows[0];
      await prisma.cliente.update({
        where: { id: c.id },
        data: {
          esProspecto: true,
          ...(origenLead && !c.origenLead ? { origenLead } : {}),
          ...(campana && !c.campana ? { campana } : {}),
        },
      });
      const candidato: ClienteCandidato = { id: c.id, nombre: c.nombre, telefono: c.telefono, correo: c.correo };
      // Mismo teléfono pero nombre muy distinto → ligamos igual pero marcamos para revisión.
      const estado: EstadoCotejo = nombresSimilares(nombre, c.nombre) ? 'LIGADO' : 'DUPLICADO_POSIBLE';
      return { clienteId: c.id, estado, clienteExistente: candidato };
    }
  }

  // 2. Sin match por teléfono, pero existe un cliente con el mismo nombre → posible duplicado.
  if (nombre) {
    const porNombre = await prisma.cliente.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' } },
      select: { id: true, nombre: true, telefono: true, correo: true },
    });
    if (porNombre) {
      return {
        clienteId: porNombre.id,
        estado: 'DUPLICADO_POSIBLE',
        clienteExistente: porNombre,
      };
    }
  }

  // 3. Nada coincide → crear cliente nuevo.
  const creado = await prisma.cliente.create({
    data: {
      nombre,
      telefono: telefono || null,
      correo,
      esProspecto: true,
      origenLead,
      campana,
    },
    select: { id: true, nombre: true, telefono: true, correo: true },
  });
  return { clienteId: creado.id, estado: 'CREADO', clienteExistente: creado };
}
