"use client";

import { useEffect, useState } from "react";
import { normalizarAmPm } from "@/lib/hora";

interface Actividad {
  id: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  descripcion: string;
  createdAt: string;
}

const ACCION_BADGE: Record<string, string> = {
  CREAR: "ms-badge-green",
  EDITAR: "ms-badge-blue",
  ELIMINAR: "ms-badge-red",
  APROBAR: "ms-badge-gold",
  ENVIAR: "ms-badge-purple",
  VER: "ms-badge-gray",
};

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const hora = normalizarAmPm(d.toLocaleString("es-MX", { hour: "numeric", minute: "2-digit" }));
  if (mismoDia(d, hoy)) return `Hoy, ${hora}`;
  if (mismoDia(d, ayer)) return `Ayer, ${hora}`;
  return normalizarAmPm(d.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }));
}

export default function MiActividadPage() {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/actividad?userId=me&take=100")
      .then((r) => r.json())
      .then((d) => { setActividades(d.actividades ?? []); setLoading(false); });
  }, []);

  return (
    <div className="ms-page-narrow space-y-4">
      <div>
        <h1 className="ms-h1">Mi actividad</h1>
        <p className="ms-subtitle">Lo que has registrado en el sistema, en orden</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-600 text-sm">Cargando...</div>
      ) : actividades.length === 0 ? (
        <div className="ms-empty-state">Aún no tienes actividad registrada</div>
      ) : (
        <div className="ms-card divide-y divide-[#1a1a1a]">
          {actividades.map((a) => (
            <div key={a.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className={`ms-badge ${ACCION_BADGE[a.accion] ?? "ms-badge-gray"} mt-0.5 shrink-0`}>
                  {a.accion}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-200 truncate">{a.descripcion}</p>
                  <p className="ms-micro mt-0.5">{a.entidad}</p>
                </div>
              </div>
              <span className="ms-meta whitespace-nowrap shrink-0">{fmtFecha(a.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
