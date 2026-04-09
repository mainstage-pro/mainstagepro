import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar user={session} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
