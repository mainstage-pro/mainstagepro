"use client";

import { useState, useCallback } from "react";
import { useConfirm } from "@/components/Confirm";

interface Version {
  id: string;
  snapshot: string;
  nota: string | null;
  createdAt: string;
  usuario: { name: string };
}

interface Props {
  entidad: string;
  entidadId: string;
  onRestaurar?: (datos: Record<string, unknown>) => void;
}

export default function VersionHistorial({ entidad, entidadId, onRestaurar }: Props) {
  const confirm = useConfirm();
  const [abierto, setAbierto] = useState(false);
  const [versiones, setVersiones] = useState<Version[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/versiones?entidad=${entidad}&entidadId=${entidadId}`);
      const data = await res.json();
      setVersiones(data.versiones ?? []);
    } finally {
      setCargando(false);
    }
  }, [entidad, entidadId]);

  const toggle = () => {
    if (!abierto) cargar();
    setAbierto(v => !v);
  };

  const restaurar = async (v: Version) => {
    if (!onRestaurar) return;
    if (!await confirm({ message: `¿Restaurar al estado guardado el ${new Date(v.createdAt).toLocaleString("es-MX")}?`, danger: true, confirmText: "Restaurar" })) return;
    try {
      const datos = JSON.parse(v.snapshot) as Record<string, unknown>;
      onRestaurar(datos);
    } catch { /* malformed snapshot */ }
  };

  return (
    <div className="border border-[#1e1e1e] rounded-lg overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#888] hover:text-white hover:bg-[#111] transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Historial de versiones
        </span>
        <svg className={`w-4 h-4 transition-transform ${abierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {abierto && (
        <div className="border-t border-[#1e1e1e] bg-[#0d0d0d]">
          {cargando ? (
            <p className="px-4 py-4 text-sm text-[#555]">Cargando historial...</p>
          ) : versiones.length === 0 ? (
            <p className="px-4 py-4 text-sm text-[#555]">No hay versiones guardadas aún.</p>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {versiones.map((v, idx) => (
                <div key={v.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <span className="text-white font-medium">v{versiones.length - idx}</span>
                    <span className="text-[#555] ml-3">{new Date(v.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</span>
                    <span className="text-[#666] ml-3">por {v.usuario?.name ?? "—"}</span>
                    {v.nota && <span className="text-[#888] ml-3 text-xs">{v.nota}</span>}
                  </div>
                  {onRestaurar && (
                    <button
                      onClick={() => restaurar(v)}
                      className="text-[#B3985B] hover:text-white text-xs border border-[#B3985B]/30 hover:border-[#B3985B] px-2 py-1 rounded transition-colors"
                    >
                      Restaurar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
