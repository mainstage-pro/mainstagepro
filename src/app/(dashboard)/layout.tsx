import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import GlobalQuickTask from "@/components/GlobalQuickTask";
import { Providers } from "@/components/Providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Fetch config and user module access in parallel — fallback gracefully if tables missing
  let labels: Record<string, string> = {};
  let privateModules: string[] = [];
  let userModuleKeys: string[] | null = null;

  try {
    const [configRows, accesos] = await Promise.all([
      prisma.appConfig.findMany(),
      session.role !== "ADMIN"
        ? prisma.moduloAcceso.findMany({ where: { userId: session.id }, select: { moduloKey: true } })
        : Promise.resolve(null),
    ]);
    const configMap = Object.fromEntries(configRows.map(r => [r.key, r.value]));
    labels = configMap["nav.labels"] ? JSON.parse(configMap["nav.labels"]) : {};
    privateModules = configMap["nav.private"] ? JSON.parse(configMap["nav.private"]) : [];
    userModuleKeys = accesos === null ? null : accesos.map(a => a.moduloKey);
  } catch {
    // Tables may not exist yet — admin sees everything, no private modules
    userModuleKeys = session.role === "ADMIN" ? null : [];
  }

  // Area-based module filtering — if access control is off but user has area, apply area preset
  const AREA_MODULES: Record<string, string[]> = {
    ADMINISTRACION: ["finanzas", "rrhh", "ats", "rrhh-onboarding", "proyectos", "operaciones", "calendario"],
    MARKETING: ["contenido-organico", "publicidad", "calendario", "presentaciones"],
    VENTAS: ["crm-clientes", "crm-tratos", "cotizaciones", "comisiones", "calendario"],
    PRODUCCION: ["proyectos", "operaciones", "inventario", "bd-proveedores", "bd-tecnicos", "bd-roles", "calendario"],
  };
  if (session.role !== "ADMIN" && session.area && AREA_MODULES[session.area]) {
    // If no explicit accesos set (userModuleKeys is empty array when privateModules is enabled),
    // or if privateModules is not enabled, restrict to area modules
    if (!userModuleKeys || userModuleKeys.length === 0) {
      userModuleKeys = AREA_MODULES[session.area];
    }
  }

  return (
    <Providers>
      <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
        <Sidebar
          user={session}
          labels={labels}
          privateModules={privateModules}
          userModuleKeys={userModuleKeys}
        />
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
          {children}
        </main>
        <GlobalQuickTask />
      </div>
    </Providers>
  );
}
