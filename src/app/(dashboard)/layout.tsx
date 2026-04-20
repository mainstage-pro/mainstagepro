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

  // Fetch config and user module access — non-admins always have restricted access
  let labels: Record<string, string> = {};
  let userModuleKeys: string[] | null = null;

  const AREA_MODULES: Record<string, string[]> = {
    ADMINISTRACION: ["finanzas", "rrhh", "ats", "rrhh-onboarding", "proyectos", "operaciones", "calendario", "inversiones", "tabulador"],
    MARKETING: ["contenido-organico", "publicidad", "calendario", "presentaciones", "operaciones"],
    VENTAS: ["crm-clientes", "crm-tratos", "cotizaciones", "comisiones", "calendario", "operaciones"],
    PRODUCCION: ["proyectos", "operaciones", "inventario", "bd-proveedores", "bd-tecnicos", "catalogo", "calendario"],
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
        <GlobalQuickTask />
      </div>
    </Providers>
  );
}
