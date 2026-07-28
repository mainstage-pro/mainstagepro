import Link from "next/link";
import {
  FileBarChart, LineChart, TrendingUp, BarChart3, ClipboardCheck,
  Wallet, CalendarClock, FolderKanban, Star, FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Centro de Reportes de Dirección.
// Fuente única y ordenada de todos los reportes y evaluaciones para alta dirección.
// No duplica lógica: cada tarjeta enlaza al reporte que ya vive en su módulo.

type Reporte = {
  label: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  area: string;
};

type Grupo = {
  titulo: string;
  desc: string;
  reportes: Reporte[];
};

const GOLD = "#B3985B";

const GRUPOS: Grupo[] = [
  {
    titulo: "Cierre mensual por área",
    desc: "El ciclo mensual de dirección: cada área entrega su reporte (materia prima) y dirección lo evalúa (juicio).",
    reportes: [
      { label: "Reporte mensual de área", desc: "Cierre estándar de cada área: resultados, KPIs vs meta, análisis, bloqueos y compromisos.", href: "/reportes-area", icon: FileText, area: "Áreas" },
      { label: "Evaluación de áreas", desc: "Dirección califica 1-5 la operación de cada responsable, con base en su reporte.", href: "/direccion/evaluacion-areas", icon: Star, area: "Áreas" },
    ],
  },
  {
    titulo: "Reportes de detalle por módulo",
    desc: "Reportes profundos de cada área para ir al fondo de los números.",
    reportes: [
      { label: "Dirección · Estado de resultados", desc: "P&L mensual: ingresos, márgenes, nómina y utilidad neta.", href: "/direccion/estado-resultados", icon: LineChart, area: "Dirección" },
      { label: "Ventas · Reporte", desc: "Tratos, cotizaciones, cierres y desempeño por vendedor.", href: "/ventas/reporte", icon: TrendingUp, area: "Ventas" },
      { label: "Marketing · Resultados", desc: "Orgánico y campañas: alcance, leads y resultados de pauta.", href: "/marketing/resultados", icon: BarChart3, area: "Marketing" },
      { label: "Producción · Reporte", desc: "Operación técnica, uso de equipo y ejecución de eventos.", href: "/produccion/reporte", icon: ClipboardCheck, area: "Producción" },
      { label: "Administración · Reportes", desc: "Cuentas, cobros/pagos y estado administrativo.", href: "/admin/reportes", icon: Wallet, area: "Administración" },
    ],
  },
  {
    titulo: "Evaluación de servicios",
    desc: "El juicio de dirección sobre la entrega de cada evento producido.",
    reportes: [
      { label: "Evaluación de proyectos", desc: "Reporte del coordinador + evaluación de dirección por evento.", href: "/proyectos", icon: FolderKanban, area: "Proyectos" },
    ],
  },
  {
    titulo: "Seguimiento semanal",
    desc: "El pulso de corto plazo del equipo, para la junta de inicio de semana.",
    reportes: [
      { label: "Visión semanal", desc: "Dónde está cada área, qué viene y qué necesita de apoyo.", href: "/vision-semanal", icon: CalendarClock, area: "Semanal" },
    ],
  },
];

export default function CentroReportesPage() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <FileBarChart className="w-6 h-6" style={{ color: GOLD }} />
          Centro de Reportes
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Todos los reportes y evaluaciones de la empresa, en un solo lugar y ordenados para dirección.
        </p>
      </div>

      {GRUPOS.map((grupo) => (
        <section key={grupo.titulo} className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">{grupo.titulo}</h2>
            <p className="text-xs text-white/40 mt-0.5">{grupo.desc}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {grupo.reportes.map((r) => {
              const Icon = r.icon;
              return (
                <Link
                  key={r.href + r.label}
                  href={r.href}
                  className="ms-card rounded-xl p-4 flex items-start gap-3 hover:bg-white/[0.03] transition group"
                >
                  <div className="p-2 rounded-lg shrink-0" style={{ background: "rgba(179,152,91,0.12)" }}>
                    <Icon className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm group-hover:text-white">{r.label}</div>
                    <div className="text-xs text-white/45 mt-0.5">{r.desc}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
