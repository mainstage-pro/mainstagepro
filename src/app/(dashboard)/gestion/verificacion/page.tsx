import { getSession, puedeVerificar } from "@/lib/auth";
import VerificacionClient from "../../verificacion/VerificacionClient";

// Ruta restringida server-side a Administración / Dirección / ADMIN.
export default async function GestionVerificacionTab() {
  const session = await getSession();

  if (!session || !puedeVerificar(session)) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-[10px] text-red-400/70 uppercase tracking-[0.2em] font-semibold">403 · Sin acceso</p>
        <p className="ms-h1 mt-2 text-white">Módulo restringido</p>
        <p className="text-gray-500 text-sm mt-2">
          La verificación de tareas está disponible sólo para Administración y Dirección.
        </p>
      </div>
    );
  }

  return <VerificacionClient />;
}
