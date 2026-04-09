"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CatEquipo { id: string; nombre: string }
interface Equipo {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  estado: string;
  categoria: { nombre: string };
}
interface Registro {
  id: string;
  fecha: string;
  tipo: string;
  accionRealizada: string;
  estadoEquipo: string | null;
  comentarios: string | null;
  proximoMantenimiento: string | null;
  equipo: Equipo;
}

const TIPOS = ["PREVENTIVO", "CORRECTIVO", "ESTETICO", "FUNCIONAL"];
const ESTADOS_EQUIPO = ["ACTIVO", "EN_MANTENIMIENTO", "DADO_DE_BAJA"];
const TIPO_COLORS: Record<string, string> = {
  PREVENTIVO: "bg-blue-900/40 text-blue-300",
  CORRECTIVO: "bg-red-900/40 text-red-300",
  ESTETICO: "bg-purple-900/40 text-purple-300",
  FUNCIONAL: "bg-green-900/40 text-green-300",
};
const ESTADO_COLORS: Record<string, string> = {
  ACTIVO: "text-green-400",
  EN_MANTENIMIENTO: "text-yellow-400",
  DADO_DE_BAJA: "text-red-400",
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MantenimientoPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroEquipo, setFiltroEquipo] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  // Formulario nuevo registro
  const [showForm, setShowForm] = useState(false);
  const [fEquipo, setFEquipo] = useState("");
  const [fFecha, setFFecha] = useState(new Date().toISOString().split("T")[0]);
  const [fTipo, setFTipo] = useState("PREVENTIVO");
  const [fAccion, setFAccion] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fComentarios, setFComentarios] = useState("");
  const [fProximo, setFProximo] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    if (filtroEquipo) params.set("equipoId", filtroEquipo);
    if (filtroTipo) params.set("tipo", filtroTipo);
    const res = await fetch(`/api/mantenimiento?${params}`);
    const d = await res.json();
    setRegistros(d.registros ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/equipos?todos=true")
      .then(r => r.json())
      .then(d => setEquipos(d.equipos ?? []));
  }, []);

  useEffect(() => { load(); }, [filtroEquipo, filtroTipo]);

  async function guardar() {
    if (!fEquipo || !fAccion.trim()) return;
    setSaving(true);
    const res = await fetch("/api/mantenimiento", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipoId: fEquipo,
        fecha: fFecha,
        tipo: fTipo,
        accionRealizada: fAccion.trim(),
        estadoEquipo: fEstado || null,
        comentarios: fComentarios || null,
        proximoMantenimiento: fProximo || null,
      }),
    });
    const d = await res.json();
    if (d.registro) {
      setRegistros(prev => [d.registro, ...prev]);
      setShowForm(false);
      setFEquipo(""); setFAccion(""); setFEstado(""); setFComentarios(""); setFProximo("");
    }
    setSaving(false);
  }

  // Stats
  const pendientesProximos = registros.filter(r => {
    if (!r.proximoMantenimiento) return false;
    const dias = (new Date(r.proximoMantenimiento).getTime() - Date.now()) / 86400000;
    return dias <= 30 && dias >= 0;
  }).length;
  const vencidos = registros.filter(r => {
    if (!r.proximoMantenimiento) return false;
    return new Date(r.proximoMantenimiento) < new Date();
  }).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Mantenimiento de equipos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{registros.length} registros</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
          + Nuevo registro
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Total registros</p>
          <p className="text-white text-2xl font-bold">{registros.length}</p>
        </div>
        <div className={`bg-[#111] border rounded-xl p-4 ${pendientesProximos > 0 ? "border-yellow-700/50" : "border-[#222]"}`}>
          <p className="text-gray-500 text-xs mb-1">Próximos 30 días</p>
          <p className={`text-2xl font-bold ${pendientesProximos > 0 ? "text-yellow-400" : "text-gray-600"}`}>
            {pendientesProximos}
          </p>
          <p className="text-gray-600 text-xs">por realizar</p>
        </div>
        <div className={`bg-[#111] border rounded-xl p-4 ${vencidos > 0 ? "border-red-700/50" : "border-[#222]"}`}>
          <p className="text-gray-500 text-xs mb-1">Vencidos</p>
          <p className={`text-2xl font-bold ${vencidos > 0 ? "text-red-400" : "text-gray-600"}`}>{vencidos}</p>
          <p className="text-gray-600 text-xs">sin atender</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <select value={filtroEquipo} onChange={e => setFiltroEquipo(e.target.value)}
          className="bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] flex-1">
          <option value="">Todos los equipos</option>
          {equipos.map(e => (
            <option key={e.id} value={e.id}>{e.descripcion}{e.marca ? ` · ${e.marca}` : ""}</option>
          ))}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]">
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nuevo registro de mantenimiento</p>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Equipo *</label>
              <select value={fEquipo} onChange={e => setFEquipo(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]">
                <option value="">Seleccionar equipo...</option>
                {equipos.map(e => (
                  <option key={e.id} value={e.id}>{e.descripcion}{e.marca ? ` · ${e.marca}` : ""}{e.modelo ? ` ${e.modelo}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Fecha *</label>
              <input type="date" value={fFecha} onChange={e => setFFecha(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Tipo *</label>
              <select value={fTipo} onChange={e => setFTipo(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]">
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Estado resultante del equipo</label>
              <select value={fEstado} onChange={e => setFEstado(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]">
                <option value="">Sin cambio de estado</option>
                {ESTADOS_EQUIPO.map(e => <option key={e} value={e}>{e.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-gray-500 text-xs mb-1 block">Acción realizada *</label>
            <textarea value={fAccion} onChange={e => setFAccion(e.target.value)} rows={2}
              placeholder="Describe detalladamente qué se hizo..."
              className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Comentarios adicionales</label>
              <textarea value={fComentarios} onChange={e => setFComentarios(e.target.value)} rows={2}
                className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] resize-none" />
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Próximo mantenimiento</label>
              <input type="date" value={fProximo} onChange={e => setFProximo(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-white px-4 py-2 transition-colors">Cancelar</button>
            <button onClick={guardar} disabled={saving || !fEquipo || !fAccion.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : "Guardar registro"}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Cargando...</div>
      ) : registros.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">Sin registros de mantenimiento</p>
          <p className="text-gray-600 text-xs mt-1">Registra el primer mantenimiento con el botón de arriba</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          {registros.map((r, i) => {
            const diasProximo = r.proximoMantenimiento
              ? (new Date(r.proximoMantenimiento).getTime() - Date.now()) / 86400000
              : null;
            const alertaProximo = diasProximo !== null && diasProximo <= 30;
            const vencido = diasProximo !== null && diasProximo < 0;

            return (
              <div key={r.id} className={`px-5 py-4 ${i > 0 ? "border-t border-[#1a1a1a]" : ""}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[r.tipo] ?? "bg-[#222] text-gray-400"}`}>
                        {r.tipo}
                      </span>
                      <Link href={`/catalogo/equipos`}
                        className="text-white font-medium text-sm hover:text-[#B3985B] transition-colors">
                        {r.equipo.descripcion}
                      </Link>
                      {(r.equipo.marca || r.equipo.modelo) && (
                        <span className="text-gray-500 text-xs">{[r.equipo.marca, r.equipo.modelo].filter(Boolean).join(" ")}</span>
                      )}
                      <span className="text-gray-600 text-xs">· {r.equipo.categoria.nombre}</span>
                    </div>
                    <p className="text-gray-300 text-sm">{r.accionRealizada}</p>
                    {r.comentarios && <p className="text-gray-500 text-xs mt-1">{r.comentarios}</p>}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-gray-600 text-xs">{fmtDate(r.fecha)}</span>
                      {r.estadoEquipo && (
                        <span className={`text-xs font-medium ${ESTADO_COLORS[r.estadoEquipo] ?? "text-gray-400"}`}>
                          → {r.estadoEquipo.replace(/_/g, " ")}
                        </span>
                      )}
                      {r.proximoMantenimiento && (
                        <span className={`text-xs font-medium ${vencido ? "text-red-400" : alertaProximo ? "text-yellow-400" : "text-gray-500"}`}>
                          {vencido ? "⚠ Vencido: " : alertaProximo ? "⚡ Próximo: " : "Siguiente: "}
                          {fmtDate(r.proximoMantenimiento)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
