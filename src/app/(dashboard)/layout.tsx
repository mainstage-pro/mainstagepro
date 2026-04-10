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

  // Fetch config and user module access in parallel
  const [configRows, accesos] = await Promise.all([
    prisma.appConfig.findMany(),
    session.role !== "ADMIN"
      ? prisma.moduloAcceso.findMany({ where: { userId: session.id }, select: { moduloKey: true } })
      : Promise.resolve(null),
  ]);

  const configMap = Object.fromEntries(configRows.map(r => [r.key, r.value]));
  const labels: Record<string, string> = configMap["nav.labels"] ? JSON.parse(configMap["nav.labels"]) : {};
  const privateModules: string[] = configMap["nav.private"] ? JSON.parse(configMap["nav.private"]) : [];
  // null = admin (sees everything), string[] = user's granted module keys
  const userModuleKeys: string[] | null = accesos === null ? null : accesos.map(a => a.moduloKey);

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
