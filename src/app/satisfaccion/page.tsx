"use client";

import { useEffect, useMemo, useState } from "react";
import EncuestaSatisfaccionForm from "@/components/EncuestaSatisfaccionForm";
import type { Respuestas } from "@/lib/satisfaccion-form";

const DEPT_LABEL: Record<string, string> = {
  BODEGA: "Bodega", COORDINACION: "Coordinación", PRODUCCION: "Producción",
  ADMINISTRACION: "Administración", VENTAS: "Ventas", GENERAL: "General",
};

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';

type Persona = { id: string; nombre: string; puesto: string; departamento: string };

export default function SatisfaccionSelfServicePage() {
  const [personal, setPersonal] = useState<Persona[]>([]);
  const [periodo, setPeriodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [personalId, setPersonalId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rrhh/satisfaccion-publica")
      .then(r => r.json())
      .then(d => { setPersonal(d.personal ?? []); setPeriodo(d.periodo ?? ""); })
      .catch(() => setError("No se pudo cargar la lista del equipo"))
      .finally(() => setLoading(false));
  }, []);

  const seleccionado = useMemo(() => personal.find(p => p.id === personalId) ?? null, [personal, personalId]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return personal;
    return personal.filter(p => p.nombre.toLowerCase().includes(q));
  }, [personal, busqueda]);

  const enviar = async (respuestas: Respuestas): Promise<{ ok: boolean; error?: string }> => {
    const r = await fetch("/api/rrhh/satisfaccion-publica", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalId, periodo, respuestas }),
    });
    if (r.ok) return { ok: true };
    const d = await r.json().catch(() => ({}));
    return { ok: false, error: d.error };
  };

  if (loading) return (
    <div style={{ fontFamily: FONT }} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-[#555] text-sm">Cargando...</p>
    </div>
  );

  if (seleccionado) return (
    <EncuestaSatisfaccionForm
      nombre={seleccionado.nombre}
      puesto={seleccionado.puesto}
      periodo={periodo}
      onSubmit={enviar}
      onCambiarUsuario={() => { setPersonalId(""); setBusqueda(""); }}
    />
  );

  // Paso 1 — seleccionar usuario
  return (
    <div style={{ fontFamily: FONT }} className="min-h-screen bg-[#0a0a0a] py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center pt-4 pb-2">
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-3">Mainstage Pro</p>
          <h1 className="text-white text-2xl font-bold mb-1">Satisfacción y Mejora del Equipo</h1>
          <p className="text-[#555] text-sm">Selecciona tu nombre para comenzar</p>
          {periodo && <p className="text-[#333] text-xs mt-1">Período: {periodo}</p>}
        </div>

        {error && <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-3 text-red-400 text-sm text-center">{error}</div>}

        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Busca tu nombre..."
          className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/40"
        />

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtrados.map(p => (
            <button
              key={p.id}
              onClick={() => setPersonalId(p.id)}
              className="w-full text-left bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3 hover:border-[#B3985B]/40 hover:bg-[#141414] transition-all"
            >
              <p className="text-white text-sm font-semibold">{p.nombre}</p>
              <p className="text-[#555] text-xs">{p.puesto} · {DEPT_LABEL[p.departamento] ?? p.departamento}</p>
            </button>
          ))}
          {filtrados.length === 0 && <p className="text-center text-[#444] text-sm py-6">Sin resultados</p>}
        </div>
      </div>
    </div>
  );
}
