"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  sugerirConsecuencia,
  etiquetaGravedad,
  etiquetaNivel,
  type Gravedad,
} from "@/lib/faltas-constantes";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Personal { id: string; nombre: string; puesto: string; departamento: string; activo: boolean; }
interface TipoFalta {
  id: string; codigo: string | null; nombre: string; categoria: string;
  gravedad: string; deteccion: string; descripcion: string | null; esDescuento: boolean;
}
interface Acta {
  id: string; folio: string; personalId: string; tipoId: string | null; gravedad: string;
  fecha: string; hechos: string; evidenciaUrl: string | null; nivelEscalon: number;
  consecuencia: string; montoDescuento: number | null; incidenciaId: string | null;
  descargo: string | null; levantadaPor: string | null; estado: string; token: string;
  aceptada: boolean; aceptadaNombre: string | null; aceptadaEn: string | null;
  personal: { id: string; nombre: string; puesto: string };
  tipo: { id: string; nombre: string; codigo: string | null; categoria: string } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const GRAVEDAD_STYLE: Record<string, string> = {
  LEVE:      "border-yellow-700 bg-yellow-900/20 text-yellow-300",
  GRAVE:     "border-orange-700 bg-orange-900/20 text-orange-300",
  MUY_GRAVE: "border-red-700 bg-red-900/20 text-red-300",
};
const ESTADO_STYLE: Record<string, string> = {
  ABIERTA:   "border-blue-700 bg-blue-900/20 text-blue-300",
  NOTIFICADA:"border-purple-700 bg-purple-900/20 text-purple-300",
  ACEPTADA:  "border-green-700 bg-green-900/20 text-green-300",
  ANULADA:   "border-[#333] bg-[#1a1a1a] text-gray-500",
};
const CATEGORIAS: Record<string, string> = {
  ASISTENCIA: "Asistencia", CONDUCTA: "Conducta", OPERACION: "Operación",
  DESEMPEÑO: "Desempeño", RECONOCIMIENTO: "Reconocimiento",
};
function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
function fmtFecha(s: string) {
  return new Date(s.length <= 10 ? s + "T12:00:00" : s).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}
function mxn(n: number) { return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" }); }

// ══════════════════════════════════════════════════════════════════════════════
export default function ActasPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [tipos, setTipos] = useState<TipoFalta[]>([]);
  const [actas, setActas] = useState<Acta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPersona, setFiltroPersona] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detalle, setDetalle] = useState<Acta | null>(null);

  const cargarActas = useCallback(async () => {
    setLoading(true);
    const q = filtroPersona ? `?personalId=${filtroPersona}` : "";
    const r = await fetch(`/api/rrhh/actas${q}`, { cache: "no-store" });
    const d = await r.json();
    setActas(d.actas ?? []);
    setLoading(false);
  }, [filtroPersona]);

  useEffect(() => {
    fetch("/api/rrhh/personal").then(r => r.json()).then(d => setPersonal(d.personal ?? []));
    fetch("/api/rrhh/faltas-catalogo").then(r => r.json()).then(d => setTipos(d.tipos ?? []));
  }, []);
  useEffect(() => { cargarActas(); }, [cargarActas]);

  async function anular(a: Acta) {
    const ok = await confirm({
      title: "Anular acta", danger: true, confirmText: "Anular",
      message: `¿Anular ${a.folio}? Si tiene un descuento propuesto ligado, se rechazará. Esta acción no borra el registro.`,
    });
    if (!ok) return;
    const r = await fetch(`/api/rrhh/actas/${a.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "ANULADA" }),
    });
    if (!r.ok) { toast.error("No se pudo anular"); return; }
    toast.success("Acta anulada");
    cargarActas();
  }

  async function eliminar(a: Acta) {
    const ok = await confirm({
      title: "Eliminar acta", danger: true, confirmText: "Eliminar",
      message: `¿Eliminar definitivamente ${a.folio}? Se perderá el registro y su acuse.`,
    });
    if (!ok) return;
    const r = await fetch(`/api/rrhh/actas/${a.id}`, { method: "DELETE" });
    if (!r.ok) { toast.error("No se pudo eliminar"); return; }
    toast.success("Acta eliminada");
    setDetalle(null);
    cargarActas();
  }

  const abiertas = actas.filter(a => a.estado !== "ANULADA");
  const pendientesAcuse = abiertas.filter(a => !a.aceptada).length;
  const conDescuento = abiertas.reduce((s, a) => s + (a.montoDescuento ?? 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Faltas y actas administrativas</h1>
          <p className="text-gray-500 text-sm">Registro formal de faltas con escalón de reincidencia y acuse del colaborador</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="ms-btn-primary">Levantar acta</button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <div className="ms-stat-card flex-1 min-w-[130px]">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Actas vigentes</p>
          <p className="text-lg font-bold text-white">{abiertas.length}</p>
        </div>
        <div className="ms-stat-card flex-1 min-w-[130px]">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Sin acuse</p>
          <p className="text-lg font-bold text-yellow-400">{pendientesAcuse}</p>
        </div>
        <div className="ms-stat-card flex-1 min-w-[130px]">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Descuento ligado</p>
          <p className="text-lg font-bold text-[#B3985B]">{conDescuento > 0 ? mxn(conDescuento) : "—"}</p>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-600">Colaborador:</span>
        <div className="min-w-[220px]">
          <Combobox
            value={filtroPersona}
            onChange={setFiltroPersona}
            placeholder="Todos"
            options={[{ value: "", label: "Todos" }, ...personal.map(p => ({ value: p.id, label: p.nombre }))]}
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="py-8 text-center text-gray-600 text-sm">Cargando...</div>
      ) : actas.length === 0 ? (
        <div className="ms-card p-8 text-center text-gray-500 text-sm">
          No hay actas registradas. Pulsa «Levantar acta» para documentar una falta.
        </div>
      ) : (
        <div className="space-y-2">
          {actas.map(a => (
            <button key={a.id} onClick={() => setDetalle(a)}
              className={`w-full text-left bg-[#111] border rounded-xl p-4 transition-colors hover:border-[#333] ${a.estado === "ANULADA" ? "border-[#1a1a1a] opacity-60" : "border-[#222]"}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium truncate">{a.personal.nombre}</span>
                    <span className="text-[10px] text-gray-600">{a.folio}</span>
                  </div>
                  <p className="text-gray-600 text-[11px] truncate">{a.tipo?.nombre ?? "Falta sin catalogar"} · {fmtFecha(a.fecha)}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-lg border ${GRAVEDAD_STYLE[a.gravedad] ?? ""}`}>{etiquetaGravedad(a.gravedad)}</span>
                <span className="text-[10px] px-2 py-1 rounded-lg border border-[#333] bg-[#1a1a1a] text-gray-400">{etiquetaNivel(a.nivelEscalon)}</span>
                <span className={`text-[10px] px-2 py-1 rounded-lg border ${ESTADO_STYLE[a.estado] ?? ""}`}>{a.estado}</span>
                {a.montoDescuento ? <span className="text-xs font-semibold text-[#B3985B]">{mxn(a.montoDescuento)}</span> : null}
                {a.estado !== "ANULADA" && (a.aceptada
                  ? <span className="text-[10px] text-green-400">Acuse firmado</span>
                  : <span className="text-[10px] text-yellow-500">Sin acuse</span>)}
              </div>
            </button>
          ))}
        </div>
      )}

      {modalOpen && (
        <NuevaActaModal
          personal={personal.filter(p => p.activo)}
          tipos={tipos}
          onClose={() => setModalOpen(false)}
          onCreated={() => { setModalOpen(false); cargarActas(); }}
        />
      )}

      {detalle && (
        <DetalleActaModal
          acta={detalle}
          onClose={() => setDetalle(null)}
          onAnular={() => anular(detalle)}
          onEliminar={() => eliminar(detalle)}
          onSaved={(upd) => { setDetalle(upd); cargarActas(); }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Modal: nueva acta
// ══════════════════════════════════════════════════════════════════════════════
function NuevaActaModal({ personal, tipos, onClose, onCreated }: {
  personal: Personal[]; tipos: TipoFalta[]; onClose: () => void; onCreated: () => void;
}) {
  const toast = useToast();
  const [personalId, setPersonalId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [fecha, setFecha] = useState(toDateStr(new Date()));
  const [hechos, setHechos] = useState("");
  const [montoDescuento, setMonto] = useState("");
  const [consecuencia, setConsecuencia] = useState("");
  const [consEditada, setConsEditada] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const tipoSel = tipos.find(t => t.id === tipoId) ?? null;
  const gravedad: Gravedad = (tipoSel?.gravedad as Gravedad) ?? "LEVE";
  const esReconocimiento = tipoSel?.categoria === "RECONOCIMIENTO";

  // Sugerencia de consecuencia (nivel 1 como referencia; el servidor recalcula el escalón real).
  const sugerida = useMemo(() => esReconocimiento ? "" : sugerirConsecuencia(gravedad, 1), [gravedad, esReconocimiento]);
  useEffect(() => { if (!consEditada) setConsecuencia(sugerida); }, [sugerida, consEditada]);

  const tiposPorCategoria = useMemo(() => {
    return tipos.map(t => ({ value: t.id, label: `${CATEGORIAS[t.categoria] ?? t.categoria} · ${t.nombre}` }));
  }, [tipos]);

  async function guardar() {
    if (!personalId) { toast.error("Selecciona al colaborador"); return; }
    if (!hechos.trim()) { toast.error("Describe los hechos"); return; }
    setGuardando(true);
    const monto = parseFloat(montoDescuento);
    const r = await fetch("/api/rrhh/actas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalId, tipoId: tipoId || null, fecha, hechos: hechos.trim(),
        montoDescuento: !isNaN(monto) && monto > 0 ? monto : undefined,
        consecuencia: consEditada ? consecuencia.trim() : undefined,
        gravedad,
      }),
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); toast.error(d.error ?? "No se pudo crear el acta"); setGuardando(false); return; }
    toast.success("Acta levantada");
    onCreated();
  }

  return (
    <Modal open onClose={onClose} title="Levantar acta administrativa">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Colaborador</label>
          <Combobox value={personalId} onChange={setPersonalId} placeholder="Selecciona…"
            options={personal.map(p => ({ value: p.id, label: `${p.nombre} — ${p.puesto}` }))} />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Falta / motivo</label>
          <Combobox value={tipoId} onChange={(v) => { setTipoId(v); setConsEditada(false); }} placeholder="Selecciona del catálogo…"
            options={tiposPorCategoria} />
          {tipoSel?.descripcion && <p className="text-[10px] text-gray-600 mt-1">{tipoSel.descripcion}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Gravedad</label>
            <div className={`text-sm px-3 py-2 rounded-lg border ${esReconocimiento ? "border-green-700 bg-green-900/20 text-green-300" : GRAVEDAD_STYLE[gravedad]}`}>
              {esReconocimiento ? "Reconocimiento" : etiquetaGravedad(gravedad)}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Hechos / descripción</label>
          <textarea value={hechos} onChange={e => setHechos(e.target.value)} rows={4}
            placeholder="Describe con objetividad lo ocurrido: qué, cuándo, dónde y cómo se detectó."
            className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] resize-y" />
        </div>

        {!esReconocimiento && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">Consecuencia</label>
                <span className="text-[10px] text-gray-600">Sugerida por gravedad · el escalón real se calcula al guardar</span>
              </div>
              <textarea value={consecuencia}
                onChange={e => { setConsecuencia(e.target.value); setConsEditada(true); }} rows={2}
                className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] resize-y" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Descuento a nómina (opcional)</label>
              <input type="number" min="0" step="0.01" value={montoDescuento} onChange={e => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-40 bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
              <p className="text-[10px] text-gray-600 mt-1">
                Si capturas un monto y hay una falta seleccionada, se genera una propuesta de descuento que debe aprobarse en Asistencia → Penalizaciones antes de aplicarse.
              </p>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="ms-btn-primary disabled:opacity-40">
            {guardando ? "Guardando…" : "Levantar acta"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Modal: detalle de acta + acuse
// ══════════════════════════════════════════════════════════════════════════════
function DetalleActaModal({ acta, onClose, onAnular, onEliminar, onSaved }: {
  acta: Acta; onClose: () => void; onAnular: () => void; onEliminar: () => void;
  onSaved: (a: Acta) => void;
}) {
  const toast = useToast();
  const [hechos, setHechos] = useState(acta.hechos);
  const [consecuencia, setConsecuencia] = useState(acta.consecuencia);
  const [guardando, setGuardando] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/acta/${acta.token}` : "";
  const editable = acta.estado !== "ANULADA" && !acta.aceptada;

  async function guardar() {
    setGuardando(true);
    const r = await fetch(`/api/rrhh/actas/${acta.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hechos, consecuencia }),
    });
    if (!r.ok) { toast.error("No se pudo guardar"); setGuardando(false); return; }
    const d = await r.json();
    toast.success("Acta actualizada");
    setGuardando(false);
    onSaved(d.acta);
  }

  function copiar() {
    navigator.clipboard.writeText(url).then(() => toast.success("Enlace de acuse copiado"));
  }

  return (
    <Modal open onClose={onClose} title={acta.folio}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white text-sm font-medium">{acta.personal.nombre}</span>
          <span className="text-[11px] text-gray-600">{acta.personal.puesto}</span>
          <span className={`text-[10px] px-2 py-1 rounded-lg border ${GRAVEDAD_STYLE[acta.gravedad] ?? ""}`}>{etiquetaGravedad(acta.gravedad)}</span>
          <span className="text-[10px] px-2 py-1 rounded-lg border border-[#333] bg-[#1a1a1a] text-gray-400">{etiquetaNivel(acta.nivelEscalon)}</span>
          <span className={`text-[10px] px-2 py-1 rounded-lg border ${ESTADO_STYLE[acta.estado] ?? ""}`}>{acta.estado}</span>
        </div>

        <p className="text-[11px] text-gray-600">
          {acta.tipo?.nombre ?? "Falta sin catalogar"} · {fmtFecha(acta.fecha)}
          {acta.levantadaPor ? ` · Levantada por ${acta.levantadaPor}` : ""}
        </p>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Hechos</label>
          <textarea value={hechos} onChange={e => setHechos(e.target.value)} rows={4} disabled={!editable}
            className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] resize-y disabled:opacity-60" />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Consecuencia</label>
          <textarea value={consecuencia} onChange={e => setConsecuencia(e.target.value)} rows={2} disabled={!editable}
            className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] resize-y disabled:opacity-60" />
        </div>

        {acta.montoDescuento ? (
          <div className="ms-stat-card">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Descuento ligado</p>
            <p className="text-sm font-semibold text-[#B3985B]">{mxn(acta.montoDescuento)}</p>
            <p className="text-[10px] text-gray-600 mt-1">Se aprueba/rechaza en Asistencia → Penalizaciones.</p>
          </div>
        ) : null}

        {acta.descargo && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descargo del colaborador</label>
            <p className="text-sm text-gray-300 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2">{acta.descargo}</p>
          </div>
        )}

        {/* Acuse */}
        <div className="ms-stat-card space-y-2">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Acuse del colaborador</p>
          {acta.aceptada ? (
            <p className="text-sm text-green-400">
              Firmada por {acta.aceptadaNombre}{acta.aceptadaEn ? ` · ${fmtFecha(acta.aceptadaEn)}` : ""}
            </p>
          ) : acta.estado === "ANULADA" ? (
            <p className="text-sm text-gray-500">Acta anulada.</p>
          ) : (
            <>
              <p className="text-sm text-yellow-500">Pendiente de firma.</p>
              <div className="flex items-center gap-2 flex-wrap">
                <input readOnly value={url}
                  className="flex-1 min-w-[200px] bg-[#0d0d0d] border border-[#222] text-gray-400 text-xs rounded-lg px-3 py-2" />
                <button onClick={copiar} className="px-3 py-2 rounded-lg text-xs font-medium bg-[#1a1a1a] border border-[#333] text-gray-300 hover:text-white transition-colors">Copiar enlace</button>
                <a href={url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg text-xs font-medium bg-[#1a1a1a] border border-[#333] text-gray-300 hover:text-white transition-colors">Abrir</a>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between gap-2 pt-2">
          <button onClick={onEliminar} className="px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 transition-colors">Eliminar</button>
          <div className="flex gap-2">
            {acta.estado !== "ANULADA" && (
              <button onClick={onAnular} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">Anular</button>
            )}
            {editable && (
              <button onClick={guardar} disabled={guardando} className="ms-btn-primary disabled:opacity-40">
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
