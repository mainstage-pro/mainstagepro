import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AREA_DASHBOARD } from "@/lib/areas";

export const dynamic = "force-dynamic";

/**
 * `/dashboard` ya no renderiza nada: es solo el punto de entrada.
 *
 * La PWA instalada grabó "/dashboard" como `start_url` y el sistema operativo
 * no refresca ese valor aunque el manifest del servidor ya diga "/", así que
 * corregir el manifest no bastó. Aquí se decide a dónde va cada quien al
 * arrancar la app. El dashboard completo vive en `/mi-dashboard`; `/inicio`
 * (accesos frecuentes) sigue accesible desde el menú para quien lo prefiera.
 */
export default async function DashboardEntryPage() {
  const session = await getSession();

  if (session && session.role !== "ADMIN" && session.area && session.area !== "GENERAL") {
    const target = AREA_DASHBOARD[session.area];
    if (target) redirect(target);
  }

  redirect("/mi-dashboard");
}
