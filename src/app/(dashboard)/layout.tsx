import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";

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

  return (
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
    </div>
  );
}
