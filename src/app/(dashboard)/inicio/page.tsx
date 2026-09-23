import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import InicioHome from "@/components/InicioHome";
import TableroDireccion from "@/components/TableroDireccion";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.email !== OWNER_EMAIL) redirect("/dashboard");

  return (
    <div className="min-h-full bg-[#0a0a0a] text-white">
      <div className="w-full max-w-6xl mx-auto px-5 md:px-8 py-8">
        <InicioHome userName={session.name} />
        <TableroDireccion />
      </div>
    </div>
  );
}
