"use client";

import { useEffect, useState } from "react";

interface Actividad {
  id: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  descripcion: string;
  createdAt: string;
  usuario: { name: string; area: string | null };
}

const ACCION_COLORS: Record<string, string> = {
  CREAR: "text-green-400 bg-green-900/20",
  EDITAR: "text-blue-400 bg-blue-900/20",
  ELIMINAR: "text-red-400 bg-red-900/20",
  APROBAR: "text-[#B3985B] bg-[#B3985B]/10",
  ENVIAR: "text-purple-400 bg-purple-900/20",
  VER: "text-gray-500 bg-gray-800",
};

export default function ActividadPage() {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/actividad${userId ? `?userId=${userId}` : ""}`)
      .then(r => r.json())
      .then(d => { setActividades(d.actividades ?? []); setLoading(false); });
  }, [userId]);

  // suppress unused variable warning
  void userId;
  void setUserId;

  const fmtDate = (s: string) => new Date(s).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Registro de actividad</h1>
          <p className="text-[#6b7280] text-sm">Historial de acciones de todos los usuarios</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-600 text-sm">Cargando actividad...</div>
      ) : actividades.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">Sin actividad registrada</div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Usuario", "Acción", "Entidad", "Descripción", "Fecha"].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {actividades.map(a => (
                <tr key={a.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="text-white text-sm font-medium">{a.usuario.name}</p>
                    <p className="text-gray-600 text-xs">{a.usuario.area ?? "General"}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ACCION_COLORS[a.accion] ?? "text-gray-400 bg-gray-800"}`}>
                      {a.accion}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{a.entidad}</td>
                  <td className="px-4 py-2.5 text-gray-300 text-sm max-w-xs truncate">{a.descripcion}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{fmtDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
