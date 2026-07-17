"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CANAL_LABELS,
  ETAPAS_INTERNAS,
  ETAPA_INTERNA_LABELS,
  type CanalSeguimiento,
  type EtapaInterna,
} from "@/lib/proceso/valores";

type Paso = {
  id: string;
  orden: number;
  dia: number;
  diaUrgente: number | null;
  titulo: string;
  objetivo: string;
  guion: string;
  canal: string;
  herramienta: string | null;
  avanzaSubetapaA: string | null;
};

type Subetapa = {
  id: string;
  nombre: string;
  etapaInterna: string;
  generacionAutomatica: boolean;
  pasos: Paso[];
};

type Seguimiento = {
  id: string;
  numero: number | null;
  titulo: string;
  canal: string;
  guionSnapshot: string | null;
  nota: string | null;
  notaResultado: string | null;
  fechaProgramada: string;
  fechaCompletado: string | null;
};

function canalLabel(c: string) {
  return CANAL_LABELS[c as CanalSeguimiento] ?? c;
}

// Arma el link de WhatsApp con el teléfono del cliente y el mensaje (guion).
// Sanitiza el número y antepone 52 si viene sin lada de país.
function waLink(telefono: string | null | undefined, mensaje: string): string | null {
  if (!telefono) return null;
  let num = telefono.replace(/\D/g, "");
  if (!num) return null;
  if (num.length === 10) num = `52${num}`;
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${num}${texto}`;
}

// Puntos de decisión donde el motor no avanza solo: el vendedor elige el destino.
type Tono = "gold" | "green" | "red" | "amber" | "sky";
type AvanzarOpcion = { label: string; hint?: string; body: Record<string, unknown>; tono: Tono };

const TONO_CLASS: Record<Tono, string> = {
  gold: "border-[#b3985b] text-[#b3985b] hover:bg-[#b3985b]/10",
  green: "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10",
  red: "border-red-500/40 text-red-300 hover:bg-red-500/10",
  amber: "border-amber-500/40 text-amber-300 hover:bg-amber-500/10",
  sky: "border-sky-500/40 text-sky-300 hover:bg-sky-500/10",
};

function opcionesAvance(etapaInterna: string): AvanzarOpcion[] {
  switch (etapaInterna) {
    case "PRIMER_CONTACTO":
      return [
        { label: "Explorando", hint: "Aún sin evento → Nurturing", body: { action: "rutear", momentoContratacion: "EXPLORANDO" }, tono: "sky" },
        { label: "Cotizando", hint: "Tiene evento → Descubrimiento", body: { action: "rutear", momentoContratacion: "COTIZANDO" }, tono: "amber" },
        { label: "Listo para decidir", hint: "→ Descubrimiento", body: { action: "rutear", momentoContratacion: "LISTO_PARA_DECIDIR" }, tono: "green" },
        { label: "Urgente", hint: "→ Descubrimiento", body: { action: "rutear", momentoContratacion: "URGENTE" }, tono: "red" },
      ];
    case "FORMULARIO_ENVIADO":
      return [
        { label: "Descubrimiento por formulario", hint: "El cliente llenó el brief", body: { action: "descubrimiento", modo: "FORMULARIO" }, tono: "gold" },
        { label: "Descubrimiento por llamada", hint: "Levantado por el equipo", body: { action: "descubrimiento", modo: "LLAMADA" }, tono: "gold" },
      ];
    case "COTIZACION_ENVIADA":
      return [
        { label: "Ganó · confirmar", body: { action: "cambiar-subetapa", etapaInterna: "CONFIRMADA" }, tono: "green" },
        { label: "Pide cambios", body: { action: "cambiar-subetapa", etapaInterna: "CAMBIOS_Y_NEGOCIACION" }, tono: "amber" },
        { label: "Perdió", body: { action: "cambiar-subetapa", etapaInterna: "PERDIDA" }, tono: "red" },
      ];
    case "CAMBIOS_Y_NEGOCIACION":
      return [
        { label: "Ganó · confirmar", body: { action: "cambiar-subetapa", etapaInterna: "CONFIRMADA" }, tono: "green" },
        { label: "Perdió", body: { action: "cambiar-subetapa", etapaInterna: "PERDIDA" }, tono: "red" },
      ];
    default:
      return [];
  }
}

function AvanzarBloque({ etapaInterna, onAccion, busy }: { etapaInterna: string; onAccion: (body: Record<string, unknown>) => void; busy: boolean }) {
  const opciones = opcionesAvance(etapaInterna);
  if (opciones.length === 0) return null;
  return (
    <div className="rounded-lg border border-[#262626] bg-[#0d0d0d] p-3 space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Cuando termines los pasos, avanza</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {opciones.map((o) => (
          <button
            key={o.label}
            disabled={busy}
            onClick={() => onAccion(o.body)}
            className={`text-left rounded-lg border bg-[#111111] px-3 py-2 transition disabled:opacity-40 ${TONO_CLASS[o.tono]}`}
          >
            <p className="text-xs font-semibold">{o.label}</p>
            {o.hint && <p className="text-[10px] text-gray-500 mt-0.5">{o.hint}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

// Panel de corrección: para cuando el vendedor se equivocó de etapa/subetapa,
// marcó un paso que no había hecho, o avanzó por error. Todo pasa por el motor.
function CorregirBloque({
  etapaInternaActual, hayHistorial, onDeshacer, onCorregirSubetapa, busy,
}: {
  etapaInternaActual: string | null;
  hayHistorial: boolean;
  onDeshacer: () => void;
  onCorregirSubetapa: (etapaInterna: string) => void;
  busy: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="rounded-lg border border-[#262626] bg-[#0a0a0a]">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-gray-500 hover:text-gray-300 uppercase tracking-wider"
      >
        <span>↩︎ Me equivoqué · corregir</span>
        <span>{abierto ? "−" : "+"}</span>
      </button>
      {abierto && (
        <div className="px-3 pb-3 space-y-3 border-t border-[#1a1a1a] pt-3">
          {hayHistorial && (
            <div className="space-y-1">
              <button
                onClick={onDeshacer}
                disabled={busy}
                className="w-full text-left rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 px-3 py-2 text-xs font-semibold transition disabled:opacity-40"
              >
                Deshacer último paso
              </button>
              <p className="text-[10px] text-gray-600">
                Reactiva el paso más reciente que marcaste como hecho. Si ese paso te hizo avanzar de etapa, regresas a la etapa anterior.
              </p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Mover a otra etapa/subetapa</p>
            <select
              value={etapaInternaActual ?? ""}
              disabled={busy}
              onChange={(e) => { if (e.target.value && e.target.value !== etapaInternaActual) onCorregirSubetapa(e.target.value); }}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1.5 text-xs text-gray-200 focus:border-[#b3985b] outline-none disabled:opacity-40"
            >
              {ETAPAS_INTERNAS.map((ei) => (
                <option key={ei} value={ei}>{ETAPA_INTERNA_LABELS[ei as EtapaInterna]}</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-600">
              Cambia la etapa manualmente. Se cancelan los pasos pendientes y nace el primer paso de la etapa elegida.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function PasoActualPanel({ tratoId, onTransicion }: { tratoId: string; onTransicion?: () => void }) {
  const [subetapa, setSubetapa] = useState<Subetapa | null>(null);
  const [pasoActual, setPasoActual] = useState<Seguimiento | null>(null);
  const [historial, setHistorial] = useState<Seguimiento[]>([]);
  const [telefono, setTelefono] = useState<string | null>(null);
  const [guion, setGuion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [verHistorial, setVerHistorial] = useState(false);
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch(`/api/tratos/${tratoId}/proceso`);
    const d = await res.json();
    setSubetapa(d.subetapa);
    setPasoActual(d.pasoActual);
    setHistorial(d.historial ?? []);
    setTelefono(d.telefono ?? null);
    setGuion(d.pasoActual?.guionSnapshot ?? "");
    setCargando(false);
  }, [tratoId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function accionMotor(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/tratos/${tratoId}/proceso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    setNota("");
    await cargar();
    onTransicion?.();
  }

  async function marcarHecho() {
    if (!pasoActual) return;
    await accionMotor({ action: "completar", seguimientoId: pasoActual.id, notaResultado: nota || undefined });
  }

  async function deshacerUltimo() {
    await accionMotor({ action: "descompletar" });
  }

  async function corregirSubetapa(etapaInterna: string) {
    await accionMotor({ action: "cambiar-subetapa", etapaInterna });
  }

  async function reprogramar(fecha: string) {
    if (!pasoActual || !fecha) return;
    setBusy(true);
    await fetch(`/api/seguimientos/${pasoActual.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fechaProgramada: fecha }),
    });
    setBusy(false);
    cargar();
  }

  async function guardarGuion() {
    if (!pasoActual) return;
    await fetch(`/api/seguimientos/${pasoActual.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guionSnapshot: guion }),
    });
  }

  if (cargando) return <div className="text-gray-600 text-xs p-3">Cargando paso…</div>;

  // Subetapa manual (CAMBIOS_Y_NEGOCIACION): tarjetas seleccionables.
  if (subetapa && !subetapa.generacionAutomatica) {
    return (
      <div className="space-y-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{subetapa.nombre} · elige el mensaje</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {subetapa.pasos.map((p) => (
            <button
              key={p.id}
              disabled={busy}
              onClick={() => accionMotor({ action: "usar-paso", procesoPasoId: p.id })}
              className="text-left rounded-lg border border-[#262626] bg-[#111111] p-3 hover:border-[#b3985b] transition disabled:opacity-50"
            >
              <p className="text-xs font-semibold text-[#f0f0f0]">{p.titulo}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{p.objetivo}</p>
              <p className="text-[10px] text-gray-400 mt-2 line-clamp-3">{p.guion}</p>
            </button>
          ))}
        </div>
        {pasoActual && (
          <PasoActivoBloque
            paso={pasoActual} guion={guion} setGuion={setGuion} onGuardarGuion={guardarGuion}
            telefono={telefono}
            nota={nota} setNota={setNota} onHecho={marcarHecho} onReprogramar={reprogramar}
            busy={busy} total={subetapa.pasos.length}
          />
        )}
        <AvanzarBloque etapaInterna={subetapa.etapaInterna} onAccion={accionMotor} busy={busy} />
        <CorregirBloque
          etapaInternaActual={subetapa.etapaInterna} hayHistorial={historial.length > 0}
          onDeshacer={deshacerUltimo} onCorregirSubetapa={corregirSubetapa} busy={busy}
        />
      </div>
    );
  }

  if (!pasoActual) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-[#262626] bg-[#111111] p-3 text-xs text-gray-500">
          Sin paso activo en esta subetapa.
        </div>
        {subetapa && <AvanzarBloque etapaInterna={subetapa.etapaInterna} onAccion={accionMotor} busy={busy} />}
        <CorregirBloque
          etapaInternaActual={subetapa?.etapaInterna ?? null} hayHistorial={historial.length > 0}
          onDeshacer={deshacerUltimo} onCorregirSubetapa={corregirSubetapa} busy={busy}
        />
      </div>
    );
  }

  const total = subetapa?.pasos.length ?? 0;

  return (
    <div className="space-y-3">
      <PasoActivoBloque
        paso={pasoActual} guion={guion} setGuion={setGuion} onGuardarGuion={guardarGuion}
        telefono={telefono}
        nota={nota} setNota={setNota} onHecho={marcarHecho} onReprogramar={reprogramar}
        busy={busy} total={total}
      />

      {subetapa && <AvanzarBloque etapaInterna={subetapa.etapaInterna} onAccion={accionMotor} busy={busy} />}

      {historial.length > 0 && (
        <div>
          <button onClick={() => setVerHistorial((v) => !v)} className="text-[10px] text-gray-500 hover:text-gray-300">
            {verHistorial ? "Ocultar" : "Ver"} historial ({historial.length})
          </button>
          {verHistorial && (
            <ul className="mt-2 space-y-1">
              {historial.map((h) => (
                <li key={h.id} className="text-[10px] text-gray-500 border-l border-[#262626] pl-2">
                  <span className="text-gray-400">{fmt(h.fechaCompletado)}</span> · {h.titulo}
                  {h.notaResultado && <span className="text-gray-600"> — {h.notaResultado}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <CorregirBloque
        etapaInternaActual={subetapa?.etapaInterna ?? null} hayHistorial={historial.length > 0}
        onDeshacer={deshacerUltimo} onCorregirSubetapa={corregirSubetapa} busy={busy}
      />
    </div>
  );
}

function PasoActivoBloque({
  paso, guion, setGuion, onGuardarGuion, telefono, nota, setNota, onHecho, onReprogramar, busy, total,
}: {
  paso: Seguimiento;
  guion: string;
  setGuion: (v: string) => void;
  onGuardarGuion: () => void;
  telefono: string | null;
  nota: string;
  setNota: (v: string) => void;
  onHecho: () => void;
  onReprogramar: (fecha: string) => void;
  busy: boolean;
  total: number;
}) {
  const [copiado, setCopiado] = useState(false);
  const wa = waLink(telefono, guion);
  return (
    <div className="rounded-lg border border-[#262626] bg-[#111111] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#f0f0f0]">{paso.titulo}</p>
        {paso.numero != null && total > 0 && (
          <span className="text-[10px] text-gray-500">paso {paso.numero} de {total}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] text-gray-400">
        <span>Programado: {fmt(paso.fechaProgramada)}</span>
        <span>· {canalLabel(paso.canal)}</span>
      </div>
      {paso.nota && <p className="text-[10px] text-amber-500/80">{paso.nota}</p>}

      <div className="relative">
        <textarea
          value={guion}
          onChange={(e) => setGuion(e.target.value)}
          onBlur={onGuardarGuion}
          rows={4}
          className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1.5 text-xs text-gray-200 resize-y focus:border-[#b3985b] outline-none"
        />
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          {wa && (
            <a
              href={wa} target="_blank" rel="noopener noreferrer"
              title="Abrir WhatsApp con este mensaje"
              className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/25 border border-green-800/40 text-green-400 hover:border-green-600"
            >WhatsApp</a>
          )}
          <button
            onClick={() => { navigator.clipboard.writeText(guion); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
            className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-400 hover:text-[#b3985b]"
          >{copiado ? "Copiado" : "Copiar"}</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          placeholder="Nota de resultado (opcional)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className="flex-1 min-w-[140px] bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1 text-xs focus:border-[#b3985b] outline-none"
        />
        <button onClick={onHecho} disabled={busy} className="text-xs px-3 py-1 rounded bg-[#b3985b] text-black font-medium disabled:opacity-40">
          Marcar como hecho
        </button>
        <label className="text-[10px] text-gray-500 flex items-center gap-1">
          Reprogramar
          <input type="date" onChange={(e) => onReprogramar(e.target.value)} className="bg-[#0a0a0a] border border-[#262626] rounded px-1 py-0.5 text-xs" />
        </label>
      </div>
    </div>
  );
}
