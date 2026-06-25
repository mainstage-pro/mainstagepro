import { redirect } from "next/navigation";

// El módulo de Equipos fue consolidado en Inventario de Equipos
export default function EquiposRedirect() {
  redirect("/inventario/maestro");
}
