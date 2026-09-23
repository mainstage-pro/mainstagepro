import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import InicioHome from "@/components/InicioHome";

export default async function InicioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.email !== OWNER_EMAIL) redirect("/dashboard");

  // El saludo se resuelve aquí (no en el cliente) para que salga correcto desde
  // el primer pintado; calcularlo en un efecto hacía que se viera "Hola" y de
  // inmediato cambiara a "Buenas tardes".
  const hora = Number(
    new Intl.DateTimeFormat("es-MX", {
      hour: "numeric",
      // h23 explícito: con hour12:false algunos locales devuelven "24" a medianoche.
      hourCycle: "h23",
      timeZone: "America/Mexico_City",
    }).format(new Date()),
  );
  const greeting = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  return <InicioHome userName={session.name} greeting={greeting} />;
}
