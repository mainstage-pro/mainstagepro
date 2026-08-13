import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AREA_MODULE_PRESETS } from "@/lib/nav";
import Sidebar from "@/components/Sidebar";
import GlobalNewTaskPanel from "@/components/GlobalNewTaskPanel";
import QuickAccessPanel from "@/components/QuickAccessPanel";
import SolicitarCotizacionButton from "@/components/cotizaciones/SolicitarCotizacionButton";
import PwaRefreshButton from "@/components/PwaRefreshButton";
import { Providers } from "@/components/Providers";
import { NavConfigProvider } from "@/components/nav/NavConfigProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Fetch config and user module access — non-admins always have restricted access
  let labels: Record<string, string> = {};
  let navOrder: Record<string, string[]> = {};
  let tabsOrder: Record<string, string[]> = {};
  let userModuleKeys: string[] | null = null;

  const AREA_MODULES = AREA_MODULE_PRESETS;

  const parseJson = <T,>(raw: string | undefined, fallback: T): T => {
    try {
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };

  try {
    const [configRows, accesos] = await Promise.all([
      prisma.appConfig.findMany({ where: { key: { in: ["nav.labels", "nav.order", "nav.tabsOrder"] } } }),
      session.role !== "ADMIN"
        ? prisma.moduloAcceso.findMany({ where: { userId: session.id }, select: { moduloKey: true } })
        : Promise.resolve(null),
    ]);
    const byKey = Object.fromEntries(configRows.map((r) => [r.key, r.value]));
    labels = parseJson(byKey["nav.labels"], {} as Record<string, string>);
    navOrder = parseJson(byKey["nav.order"], {} as Record<string, string[]>);
    tabsOrder = parseJson(byKey["nav.tabsOrder"], {} as Record<string, string[]>);
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
    <Providers access={{ role: session.role, area: (session as { area?: string }).area ?? null, moduleKeys: userModuleKeys }}>
      <NavConfigProvider initialLabels={labels} initialOrder={navOrder} initialTabsOrder={tabsOrder}>
        <div className="flex h-screen bg-[#0a0a0a] overflow-hidden w-screen max-w-[100vw]">
          <Sidebar
            user={session}
            userModuleKeys={userModuleKeys}
          />
          <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0 min-w-0">
            {children}
          </main>
          <GlobalNewTaskPanel />
          <QuickAccessPanel />
          <SolicitarCotizacionButton />
          <PwaRefreshButton />
        </div>
      </NavConfigProvider>
    </Providers>
  );
}
