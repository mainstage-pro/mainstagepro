// Snapshot inmutable de los datos de un documento laboral (oferta / acuerdo).
// Se congela al generar el documento para que el PDF y el acuse reflejen
// exactamente lo que se ofreció, aunque el puesto o la persona cambien después.

import { prisma } from "@/lib/prisma";
import {
  jparse, jornadaToString,
  type JornadaDia, type EstandarMinimo, type ValorPerfil,
  type AptitudPerfil, type ConocimientoPerfil,
} from "@/lib/puesto";

export interface Estandar { subarea: string; responsabilidad: string; estandar: string }

// Tabla auto-migrada: se crea la primera vez que se usa (Neon, sin migración formal).
export async function ensureDocLaboralSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS documentos_laborales (
      id TEXT PRIMARY KEY,
      personal_id TEXT NOT NULL,
      puesto_id TEXT,
      tipo TEXT NOT NULL,
      datos TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      aceptado BOOLEAN NOT NULL DEFAULT false,
      aceptado_nombre TEXT,
      aceptado_en TIMESTAMP,
      aceptado_ip TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
}

export interface DocLaboralSnapshot {
  tipo: "OFERTA" | "ACUERDO";
  personaNombre: string;
  personaCorreo?: string | null;
  personaTelefono?: string | null;
  personaDomicilio?: string | null;
  puestoNombre: string;
  puestoVersion?: number | null;
  area: string;
  objetivoArea?: string | null;
  descripcionPuesto?: string | null;
  objetivoPuesto?: string | null;
  misionPuesto?: string | null;
  responsabilidades: string[];
  estandares: Estandar[];
  estandaresMinimos: EstandarMinimo[];
  valores: ValorPerfil[];
  aptitudes: AptitudPerfil[];
  conocimientos: ConocimientoPerfil[];
  coordinaCon: string[];
  supervisaA: string[];
  funciones: string[];
  beneficios: string[];
  prestacionesOtro?: string | null;
  salario?: number | null;
  periodoPago: string;
  tipoContrato?: string | null;
  modalidad?: string | null;
  horario?: string | null;
  fechaIngreso?: string | null;
  reportaA?: string | null;
  responsableNombre: string;
  fechaDocumento: string;
}

function arr(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && x.trim() !== "");
  if (typeof v === "string") {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p.filter((x) => typeof x === "string") : []; }
    catch { return v.split(/[\n,]/).map((x) => x.trim()).filter(Boolean); }
  }
  return [];
}

function estArr(v: unknown): Estandar[] {
  if (!v) return [];
  const raw = typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return []; } })() : v;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && typeof e === "object")
    .map((e) => ({ subarea: e.subarea ?? "", responsabilidad: e.responsabilidad ?? "", estandar: e.estandar ?? "" }));
}

type PersonaLike = {
  nombre: string; correo?: string | null; telefono?: string | null; domicilio?: string | null;
  salario?: number | null; periodoPago?: string | null; fechaIngreso?: Date | string | null;
  puesto?: string | null;
};
type PuestoLike = {
  nombre: string; area: string; version?: number | null;
  objetivoArea?: string | null; descripcionPuesto?: string | null; objetivoPuesto?: string | null; misionPuesto?: string | null;
  responsabilidades?: string | null; estandares?: string | null; estandaresMinimos?: string | null;
  valores?: string | null; aptitudes?: string | null; conocimientos?: string | null;
  coordinaCon?: string | null; supervisaA?: string | null;
  funciones?: string | null; prestaciones?: string | null; prestacionesOtro?: string | null;
  jornada?: string | null;
  tipoContrato?: string | null; modalidad?: string | null; horario?: string | null;
  reportaA?: { nombre: string } | null;
} | null;

export function buildSnapshot(
  tipo: "OFERTA" | "ACUERDO",
  persona: PersonaLike,
  puesto: PuestoLike,
  responsableNombre: string,
): DocLaboralSnapshot {
  const fecha = persona.fechaIngreso
    ? (typeof persona.fechaIngreso === "string" ? persona.fechaIngreso : persona.fechaIngreso.toISOString()).slice(0, 10)
    : null;
  const jornada = jparse<JornadaDia[]>(puesto?.jornada ?? null, []);
  const horario = puesto?.horario ?? (jornada.length ? jornadaToString(jornada) : null);
  return {
    tipo,
    personaNombre: persona.nombre,
    personaCorreo: persona.correo ?? null,
    personaTelefono: persona.telefono ?? null,
    personaDomicilio: persona.domicilio ?? null,
    puestoNombre: puesto?.nombre ?? persona.puesto ?? "Colaborador",
    // §9: congela la versión del puesto vigente al firmar.
    puestoVersion: puesto?.version ?? null,
    area: puesto?.area ?? "GENERAL",
    objetivoArea: puesto?.objetivoArea ?? null,
    descripcionPuesto: puesto?.descripcionPuesto ?? null,
    objetivoPuesto: puesto?.objetivoPuesto ?? null,
    misionPuesto: puesto?.misionPuesto ?? null,
    responsabilidades: arr(puesto?.responsabilidades),
    estandares: estArr(puesto?.estandares),
    estandaresMinimos: jparse<EstandarMinimo[]>(puesto?.estandaresMinimos ?? null, []),
    valores: jparse<ValorPerfil[]>(puesto?.valores ?? null, []),
    aptitudes: jparse<AptitudPerfil[]>(puesto?.aptitudes ?? null, []),
    conocimientos: jparse<ConocimientoPerfil[]>(puesto?.conocimientos ?? null, []),
    coordinaCon: arr(puesto?.coordinaCon),
    supervisaA: arr(puesto?.supervisaA),
    // Condiciones laborales: se leen del puesto operativo.
    funciones: arr(puesto?.funciones),
    beneficios: arr(puesto?.prestaciones),
    prestacionesOtro: puesto?.prestacionesOtro ?? null,
    salario: persona.salario ?? null,
    periodoPago: persona.periodoPago ?? "MENSUAL",
    tipoContrato: puesto?.tipoContrato ?? null,
    modalidad: puesto?.modalidad ?? null,
    horario,
    fechaIngreso: fecha,
    reportaA: puesto?.reportaA?.nombre ?? null,
    responsableNombre,
    fechaDocumento: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }),
  };
}

export const TIPO_LABEL: Record<string, string> = {
  OFERTA: "Oferta de trabajo",
  ACUERDO: "Acuerdo laboral",
};
