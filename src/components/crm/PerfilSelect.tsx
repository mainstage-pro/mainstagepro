"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type CustomPerfil,
  type PerfilCategoria,
  PERFIL_CATEGORIAS,
  PERFIL_CATEGORIA_LABELS,
  perfilesPorCategoriaCon,
} from "@/lib/proceso/perfiles";

// Hook compartido: trae los perfiles personalizados (BD) y permite refrescar.
export function usePerfilesCustom() {
  const [custom, setCustom] = useState<CustomPerfil[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/perfiles-prospecto");
      if (res.ok) {
        const d = await res.json();
        setCustom(d.perfiles ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const agregar = useCallback((p: CustomPerfil) => setCustom((prev) => [...prev, p]), []);

  return { custom, loading, refresh, agregar };
}

const SELECT_CLS =
  "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]";

export function PerfilSelect({
  value,
  onChange,
  custom,
  onCreated,
  categoriaSugerida,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  custom: CustomPerfil[];
  onCreated: (p: CustomPerfil) => void;
  categoriaSugerida?: PerfilCategoria | null;
  className?: string;
}) {
  const grupos = perfilesPorCategoriaCon(custom);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [categoria, setCategoria] = useState<PerfilCategoria>(categoriaSugerida ?? "MUSICAL");
  const [mensaje, setMensaje] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    const l = label.trim();
    if (!l) { setError("Escribe un nombre para el perfil"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/perfiles-prospecto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: l, categoria, mensajeInicial: mensaje.trim() || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo guardar");
        setSaving(false);
        return;
      }
      const d = await res.json();
      onCreated(d.perfil);
      onChange(d.perfil.id);
      setAdding(false);
      setLabel("");
      setMensaje("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLS}>
          <option value="">— Sin definir —</option>
          {grupos.map((g) => (
            <optgroup key={g.categoria} label={g.label}>
              {g.perfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.esCustom ? `${p.label} ·` : p.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { setAdding((v) => !v); setError(""); if (categoriaSugerida) setCategoria(categoriaSugerida); }}
          className="shrink-0 px-3 rounded-lg border border-[#333] text-gray-400 hover:text-[#B3985B] hover:border-[#B3985B]/40 text-sm transition-colors"
          title="Agregar un perfil nuevo"
        >
          {adding ? "×" : "+"}
        </button>
      </div>

      {adding && (
        <div className="mt-2 p-3 rounded-lg border border-[#333] bg-[#141414] space-y-2">
          <p className="text-[11px] text-gray-400">Nuevo perfil de prospecto</p>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nombre del perfil (ej. Antro, Universidad…)"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Categoría (tipo de evento)</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as PerfilCategoria)} className={SELECT_CLS}>
              {PERFIL_CATEGORIAS.map((c) => (
                <option key={c} value={c}>{PERFIL_CATEGORIA_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Mensaje inicial (opcional)</label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={3}
              placeholder="Si lo dejas vacío se usa el genérico de la categoría. Usa {nombre} y {empresa}."
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
            />
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white text-xs transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={guardar} disabled={saving} className="px-4 py-1.5 rounded-lg bg-[#B3985B] text-black font-semibold text-xs hover:bg-[#c9a96a] transition-colors disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar perfil"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
