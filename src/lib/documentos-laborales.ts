// Snapshot inmutable de los datos de un documento laboral (oferta / acuerdo).
// Se congela al generar el documento para que el PDF y el acuse reflejen
// exactamente lo que se ofreció, aunque el puesto o la persona cambien después.

export interface Estandar { subarea: string; responsabilidad: string; estandar: string }

export interface DocLaboralSnapshot {
  tipo: "OFERTA" | "ACUERDO";
  personaNombre: string;
  personaCorreo?: string | null;
  personaTelefono?: string | null;
  personaDomicilio?: string | null;
  puestoNombre: string;
  area: string;
  objetivoArea?: string | null;
  misionPuesto?: string | null;
  responsabilidades: string[];
  estandares: Estandar[];
  coordinaCon: string[];
  supervisaA: string[];
  funciones: string[];
  beneficios: string[];
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
  nombre: string; area: string; objetivoArea?: string | null; misionPuesto?: string | null;
  responsabilidades?: string | null; estandares?: string | null;
  coordinaCon?: string | null; supervisaA?: string | null;
  funciones?: string | null; prestaciones?: string | null;
  tipoContrato?: string | null; modalidad?: string | null; horario?: string | null;
  reportaA?: { nombre: string } | null;
  puestoIdeal?: PuestoIdealLike | null;
} | null;
type PuestoIdealLike = {
  funciones?: string | null; prestaciones?: string | null;
  tipoContrato?: string | null; modalidad?: string | null; horario?: string | null;
} | null;

export function buildSnapshot(
  tipo: "OFERTA" | "ACUERDO",
  persona: PersonaLike,
  puesto: PuestoLike,
  responsableNombre: string,
): DocLaboralSnapshot {
  const ideal = puesto?.puestoIdeal ?? null;
  const fecha = persona.fechaIngreso
    ? (typeof persona.fechaIngreso === "string" ? persona.fechaIngreso : persona.fechaIngreso.toISOString()).slice(0, 10)
    : null;
  return {
    tipo,
    personaNombre: persona.nombre,
    personaCorreo: persona.correo ?? null,
    personaTelefono: persona.telefono ?? null,
    personaDomicilio: persona.domicilio ?? null,
    puestoNombre: puesto?.nombre ?? persona.puesto ?? "Colaborador",
    area: puesto?.area ?? "GENERAL",
    objetivoArea: puesto?.objetivoArea ?? null,
    misionPuesto: puesto?.misionPuesto ?? null,
    responsabilidades: arr(puesto?.responsabilidades),
    estandares: estArr(puesto?.estandares),
    coordinaCon: arr(puesto?.coordinaCon),
    supervisaA: arr(puesto?.supervisaA),
    // Condiciones laborales: se leen del puesto operativo; el puesto ideal es respaldo legado.
    funciones: arr(puesto?.funciones ?? ideal?.funciones),
    beneficios: arr(puesto?.prestaciones ?? ideal?.prestaciones),
    salario: persona.salario ?? null,
    periodoPago: persona.periodoPago ?? "MENSUAL",
    tipoContrato: puesto?.tipoContrato ?? ideal?.tipoContrato ?? null,
    modalidad: puesto?.modalidad ?? ideal?.modalidad ?? null,
    horario: puesto?.horario ?? ideal?.horario ?? null,
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
