import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { AREA_DASHBOARD } from "@/lib/areas";
import DailyGreeting from "@/components/DailyGreeting";
import { NuevoTratoDropdown } from "@/components/NuevoTratoDropdown";
import TableroDireccion from "@/components/TableroDireccion";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.email === OWNER_EMAIL) redirect("/inicio");

  if (session.role !== "ADMIN" && session.area && session.area !== "GENERAL") {
    const target = AREA_DASHBOARD[session.area];
    if (target) redirect(target);
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <DailyGreeting nombre={session.name ?? ""} />
        <NuevoTratoDropdown />
      </div>
      <TableroDireccion />
    </div>
  );
}
