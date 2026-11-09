import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ItinerarioClient from "@/components/proyectos/ItinerarioClient";

export const dynamic = "force-dynamic";

export default async function ItinerarioProyectosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <ItinerarioClient />;
}
