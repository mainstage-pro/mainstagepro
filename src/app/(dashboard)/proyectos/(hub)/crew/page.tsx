import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import MesaCrewClient from "@/components/proyectos/MesaCrewClient";

export const dynamic = "force-dynamic";

export default async function MesaCrewPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <MesaCrewClient />;
}
