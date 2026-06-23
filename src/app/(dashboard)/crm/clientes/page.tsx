import { redirect } from "next/navigation";

// /crm/clientes ahora vive dentro de /crm/base-de-datos como la pestaña "Clientes"
export default function ClientesPage() {
  redirect("/crm/base-de-datos");
}
