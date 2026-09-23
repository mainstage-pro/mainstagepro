import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import InicioHome from "@/components/InicioHome";

export default async function InicioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.email !== OWNER_EMAIL) redirect("/dashboard");

  return <InicioHome userName={session.name} />;
}
