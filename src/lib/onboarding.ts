// Plantilla canónica de onboarding (integración por puesto).
//
// Los pasos son FIJOS e iguales para todos los puestos: es el recorrido estándar
// de alta de un colaborador. Solo dos pasos son DINÁMICOS y se llenan según la
// configuración del puesto (Organización → Puesto → Onboarding):
//   - "revision-modulos"     → los módulos de la plataforma que revisará (onboardingModulos)
//   - "capacitacion-area"    → las áreas de capacitación asignadas (onboardingCapacitaciones)
//
// Al iniciar el onboarding de una persona se instancia esta plantilla en los
// modelos existentes OnboardingPlan → OnboardingModulo → OnboardingTarea. Cada
// paso es un módulo con al menos una tarea marcable; los pasos dinámicos generan
// una tarea por cada módulo/área seleccionada en el puesto.

export type OnbModuloTipo = "ALINEACION" | "ADMINISTRATIVO" | "TECNICO" | "PRACTICO" | "CULTURAL";
export type OnbTareaTipo = "LECTURA" | "VIDEO" | "PRACTICA" | "EVALUACION" | "REUNION" | "SHADOWING";
export type OnbDynamic = "modulos" | "capacitaciones";

export interface OnboardingPasoDef {
  key: string;
  titulo: string;
  descripcion: string;
  tipo: OnbModuloTipo;
  tareaTipo: OnbTareaTipo;
  /** Si está presente, el paso se expande en una tarea por cada elemento de la config del puesto. */
  dynamic?: OnbDynamic;
}

export const ONBOARDING_PASOS: OnboardingPasoDef[] = [
  {
    key: "firma-documentos",
    titulo: "Firma de documentos",
    descripcion: "Firma del acuerdo de alineación operativa (derivado del puesto) y demás documentos correspondientes.",
    tipo: "ADMINISTRATIVO",
    tareaTipo: "LECTURA",
  },
  {
    key: "alta-documentacion",
    titulo: "Alta de la documentación del empleado",
    descripcion: "Solicitar y dar de alta en el sistema la documentación del nuevo colaborador (identificación, fiscal, bancaria, contacto de emergencia).",
    tipo: "ADMINISTRATIVO",
    tareaTipo: "LECTURA",
  },
  {
    key: "introduccion-equipo",
    titulo: "Introducción con el equipo",
    descripcion: "Reunión breve de introducción con sus compañeros de trabajo.",
    tipo: "CULTURAL",
    tareaTipo: "REUNION",
  },
  {
    key: "entrega-herramientas",
    titulo: "Entrega de herramientas de trabajo",
    descripcion: "Entrega de las herramientas de trabajo necesarias para el puesto.",
    tipo: "ADMINISTRATIVO",
    tareaTipo: "PRACTICA",
  },
  {
    key: "sesion-puesto",
    titulo: "Sesión explicativa del puesto",
    descripcion: "Sesión explicativa del puesto en palabras del director.",
    tipo: "ALINEACION",
    tareaTipo: "REUNION",
  },
  {
    key: "sesion-cultura",
    titulo: "Sesión de cultura de la empresa",
    descripcion: "Presentación de la cultura, valores e identidad de Mainstage.",
    tipo: "ALINEACION",
    tareaTipo: "REUNION",
  },
  {
    key: "capacitacion-plataforma",
    titulo: "Capacitación operativa de la plataforma",
    descripcion: "Capacitación del funcionamiento operativo de la empresa a través de la plataforma.",
    tipo: "TECNICO",
    tareaTipo: "PRACTICA",
  },
  {
    key: "explicar-plan-trabajo",
    titulo: "Explicación del plan de trabajo",
    descripcion: "Explicar el plan de trabajo del puesto y las expectativas de desempeño.",
    tipo: "ALINEACION",
    tareaTipo: "REUNION",
  },
  {
    key: "revision-modulos",
    titulo: "Revisión de los módulos de la plataforma",
    descripcion: "Recorrido por los módulos de la plataforma asignados a este puesto.",
    tipo: "TECNICO",
    tareaTipo: "PRACTICA",
    dynamic: "modulos",
  },
  {
    key: "capacitacion-empresa",
    titulo: "Capacitación digital — Mainstage como empresa",
    descripcion: "Iniciar la capacitación digital sobre Mainstage como empresa.",
    tipo: "ALINEACION",
    tareaTipo: "VIDEO",
  },
  {
    key: "capacitacion-area",
    titulo: "Capacitación del área",
    descripcion: "Capacitación a detalle de las áreas asignadas a este puesto para conocer el funcionamiento de la empresa.",
    tipo: "TECNICO",
    tareaTipo: "VIDEO",
    dynamic: "capacitaciones",
  },
];

/** Parse seguro de un JSON string[] guardado en un campo de texto del puesto. */
export function parseIdList(s?: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
