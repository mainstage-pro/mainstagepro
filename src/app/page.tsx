import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.email === OWNER_EMAIL) redirect("/inicio");
  redirect("/dashboard");
}
