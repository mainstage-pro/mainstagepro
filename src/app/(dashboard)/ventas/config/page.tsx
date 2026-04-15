"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface Config {
  id: string;
  metaMes1: number;
  metaMes2: number;
  metaMes3: number;
  metaMesNormal: number;
  pctClientePropio: number;
  pctPublicidad: number;
  pctAsignadoVendedor: number;
  pctAsignadoOrigen: number;
  pctBono: number;
}

export default function ConfigComisionesPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const formLoaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/ventas/config")
      .then(r => r.json())
      .then(d => {
        setConfig(d.config);
        setForm(Object.fromEntries(
          Object.entries(d.config).filter(([k]) => k !== "id" && k !== "updatedAt").map(([k, v]) => [k, String(v)])
        ));
        setTimeout(() => { formLoaded.current = true; }, 100);
      });
  }, []);

  useEffect(() => {
    if (!formLoaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaved(false);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      const res = await fetch("/api/ventas/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const d = await res.json();
        setConfig(d.config);
        setSaved(true);
      }
      setSaving(false);
    }, 1200);
  }, [form]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) { e.preventDefault(); }

  if (!config) return <div className="p-3 md:p-6 text-gray-500 text-sm">Cargando...</div>;

  return (
    <div className="p-3 md:p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/ventas" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Ventas</Link>
        <h1 className="text-2xl font-bold text-white mt-1">Configuración de Comisiones</h1>
        <p className="text-gray-400 text-sm mt-1">Parámetros modulares — modifica según la estrategia vigente</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Metas ramp-up */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider mb-1">Metas (ramp-up)</h2>
          <p className="text-xs text-gray-500 mb-4">Piso mínimo para activar bono según mes de trabajo del vendedor</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "metaMes1", label: "Mes 1", sub: "$60,000 por defecto" },
              { key: "metaMes2", label: "Mes 2", sub: "$80,000 por defecto" },
              { key: "metaMes3", label: "Mes 3", sub: "$100,000 por defecto" },
              { key: "metaMesNormal", label: "Mes 4 en adelante", sub: "$150,000 por defecto" },
            ].map(({ key, label, sub }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <p className="text-[10px] text-gray-600 mb-1">{sub}</p>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">$</span>
                  <input
                    name={key}
                    type="number"
                    value={form[key] ?? ""}
                    onChange={handleChange}
                    className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Porcentajes comisión */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider mb-1">Comisión base</h2>
          <p className="text-xs text-gray-500 mb-4">Porcentaje sobre equipos rentados con descuento, liquidados al 100%</p>
          <div className="space-y-4">
            {[
              { key: "pctClientePropio", label: "Cliente propio del vendedor", sub: "10% por defecto" },
              { key: "pctPublicidad", label: "Lead por publicidad (marketing/ads)", sub: "5% por defecto" },
            ].map(({ key, label, sub }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-white">{label}</p>
                  <p className="text-xs text-gray-600">{sub}</p>
                </div>
                <div className="flex items-center gap-2 w-28">
                  <input
                    name={key}
                    type="number"
                    value={form[key] ?? ""}
                    onChange={handleChange}
                    className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] text-right"
                    min="0"
                    max="100"
                    step="0.5"
                  />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
              </div>
            ))}

            {/* Cliente asignado */}
            <div className="border-t border-[#1a1a1a] pt-4">
              <p className="text-sm text-white mb-0.5">Cliente asignado por empresa</p>
              <p className="text-xs text-gray-500 mb-3">Se reparte entre el vendedor que cierra y el vendedor original (o empresa)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Al vendedor que cierra</label>
                  <div className="flex items-center gap-2">
                    <input
                      name="pctAsignadoVendedor"
                      type="number"
                      value={form.pctAsignadoVendedor ?? ""}
                      onChange={handleChange}
                      className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                      min="0" max="100" step="0.5"
                    />
                    <span className="text-gray-400 text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Al vendedor original / empresa</label>
                  <div className="flex items-center gap-2">
                    <input
                      name="pctAsignadoOrigen"
                      type="number"
                      value={form.pctAsignadoOrigen ?? ""}
                      onChange={handleChange}
                      className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                      min="0" max="100" step="0.5"
                    />
                    <span className="text-gray-400 text-sm">%</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Total asignado: {((parseFloat(form.pctAsignadoVendedor) || 0) + (parseFloat(form.pctAsignadoOrigen) || 0)).toFixed(1)}% (normalmente 10% total)
              </p>
            </div>
          </div>
        </div>

        {/* Bono */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider mb-1">Bono</h2>
          <p className="text-xs text-gray-500 mb-4">Aplica solo si el vendedor alcanza el piso del mes (liquidado 100%)</p>
          <div className="flex items-center gap-4">
            <p className="text-sm text-white flex-1">Bono sobre base liquidada del mes</p>
            <div className="flex items-center gap-2 w-28">
              <input
                name="pctBono"
                type="number"
                value={form.pctBono ?? ""}
                onChange={handleChange}
                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] text-right"
                min="0" max="100" step="0.5"
              />
              <span className="text-gray-400 text-sm">%</span>
            </div>
          </div>
        </div>

        {/* Meta de prospección outbound */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider mb-1">Prospección outbound</h2>
          <p className="text-xs text-gray-500 mb-4">Meta mínima de nuevos prospectos outbound por vendedor por día hábil</p>
          <div className="flex items-center gap-4">
            <p className="text-sm text-white flex-1">Meta diaria de prospectos nuevos</p>
            <div className="flex items-center gap-2 w-28">
              <input
                name="metaProspectoDiaria"
                type="number"
                value={form.metaProspectoDiaria ?? "12"}
                onChange={handleChange}
                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] text-right"
                min="1" max="100" step="1"
              />
              <span className="text-gray-400 text-sm">/ día</span>
            </div>
          </div>
        </div>

        {/* Reglas fijas (informativas) */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Reglas fijas (del documento)</h2>
          <ul className="space-y-1.5 text-xs text-gray-500">
            <li>• Venta cerrada = cuando hay anticipo recibido</li>
            <li>• Base de cálculo = monto equipos rentados (incluye descuento)</li>
            <li>• Comisión y bono se calculan sobre ventas liquidadas al 100%</li>
            <li>• Pago: mensual, primer miércoles del mes</li>
            <li>• Cartera vencida: Dirección define congelar, pagar proporcional o revertir</li>
            <li>• Descuentos especiales: requieren autorización de Dirección</li>
          </ul>
        </div>

        <div className="flex justify-end items-center gap-3">
          {saving && <span className="text-xs text-gray-500 animate-pulse">Guardando…</span>}
          {saved && !saving && <span className="text-xs text-green-500">✓ Guardado automáticamente</span>}
        </div>
      </form>
    </div>
  );
}
