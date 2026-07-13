import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import GlobalNewTaskPanel from "@/components/GlobalNewTaskPanel";
import QuickAccessPanel from "@/components/QuickAccessPanel";
import PwaRefreshButton from "@/components/PwaRefreshButton";
import { Providers } from "@/components/Providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Fetch config and user module access — non-admins always have restricted access
  let labels: Record<string, string> = {};
  let userModuleKeys: string[] | null = null;

  const AREA_MODULES: Record<string, string[]> = {
    ADMINISTRACION: ["dashboard", "plan-trabajo", "operaciones", "calendario", "vision-semanal", "finanzas", "rrhh", "ats", "inversiones", "tabulador", "tareas-administracion"],
    MARKETING:      ["dashboard", "plan-trabajo", "operaciones", "calendario", "vision-semanal", "mkt-contenido", "mkt-publicidad", "mkt-resultados", "tareas-marketing"],
    VENTAS:         ["dashboard", "plan-trabajo", "operaciones", "calendario", "vision-semanal", "ventas-seguimientos", "comercial-solicitudes", "crm-tratos", "crm-base-de-datos", "ventas-presentaciones", "ventas-reporte", "tareas-ventas"],
    PRODUCCION:     ["dashboard", "plan-trabajo", "operaciones", "calendario", "vision-semanal", "proyectos", "inventario", "inv-maestro", "catalogo", "bd-proveedores", "bd-tecnicos", "tareas-produccion"],
    RRHH:           ["dashboard", "plan-trabajo", "operaciones", "calendario", "vision-semanal", "rrhh", "ats", "tareas-rrhh"],
    DIRECCION:      ["dashboard", "plan-trabajo", "operaciones", "calendario", "vision-semanal", "juntas", "presentaciones", "capacitacion", "tareas-direccion"],
    GENERAL:        ["dashboard", "plan-trabajo", "operaciones", "calendario", "vision-semanal"],
  };

  try {
    const [configRows, accesos] = await Promise.all([
      prisma.appConfig.findMany({ where: { key: "nav.labels" } }),
      session.role !== "ADMIN"
        ? prisma.moduloAcceso.findMany({ where: { userId: session.id }, select: { moduloKey: true } })
        : Promise.resolve(null),
    ]);
    labels = configRows[0]?.value ? JSON.parse(configRows[0].value) : {};
    if (accesos !== null) {
      const keys = accesos.map(a => a.moduloKey);
      if (keys.length > 0) {
        userModuleKeys = keys;
      } else {
        // No explicit accesos — fall back to area preset or empty
        const area = (session as { area?: string }).area;
        userModuleKeys = (area && AREA_MODULES[area]) ? AREA_MODULES[area] : [];
      }
    }
  } catch {
    userModuleKeys = session.role === "ADMIN" ? null : [];
  }

  return (
    <Providers>
      <div className="flex h-screen bg-[#0a0a0a] overflow-hidden w-screen max-w-[100vw]">
        <Sidebar
          user={session}
          labels={labels}
          userModuleKeys={userModuleKeys}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0 min-w-0">
          {children}
        </main>
        <GlobalNewTaskPanel />
        <QuickAccessPanel />
        <PwaRefreshButton />
      </div>
    </Providers>
  );
}
