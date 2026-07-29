import type { ModuleNavTab } from "@/components/ModuleTabsLayout";

export const personalTabs: ModuleNavTab[] = [
  { href: "/personal/candidatos", label: "Candidatos", accessKey: "rrhh-candidatos" },
  { href: "/personal/onboarding", label: "Integración / Onboarding", accessKey: "rrhh-onboarding" },
  { href: "/personal/interno", label: "Personal interno", accessKey: "rrhh-personal" },
  { href: "/personal/nomina", label: "Nómina", accessKey: "rrhh-nomina" },
  { href: "/personal/asistencia", label: "Asistencia", accessKey: "rrhh-asistencia" },
  { href: "/personal/actas", label: "Faltas y actas", accessKey: "rrhh-evaluaciones" },
  { href: "/personal/cumplimiento", label: "Tablero de cumplimiento", accessKey: "rrhh-evaluaciones" },
  { href: "/personal/tabulador", label: "Tabulador freelancers", accessKey: "tabulador" },
  { href: "/personal/evaluaciones", label: "Evaluaciones", accessKey: "rrhh-evaluaciones" },
  { href: "/personal/satisfaccion", label: "Satisfacción equipo", accessKey: "rrhh-satisfaccion" },
  { href: "/personal/configuracion", label: "Configuración", accessKey: "rrhh-config" },
];
