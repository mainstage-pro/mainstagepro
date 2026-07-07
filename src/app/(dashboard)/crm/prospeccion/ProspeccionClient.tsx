"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Usuario { id: string; name: string }

interface Prospeccion {
  id: string;
  tipo: string;
  etapa: string;
  estado: string;
  tipoEvento: string;
  origen: string;
  notas: string | null;
  fechaProximoContacto: string | null;
  contacto1Hecho: boolean;
  contacto2Hecho: boolean;
  contacto3Hecho: boolean;
  contacto4Hecho: boolean;
  contacto5Hecho: boolean;
  cliente: {
    id: string;
    nombre: string;
    empresa: string | null;
    telefono: string | null;
    correo: string | null;
    tipoCliente: string;
  };
  responsable: { id: string; name: string } | null;
  trato: { id: string; etapa: string; nombreEvento: string | null } | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ETAPAS_ORDEN = [
  "SIN_ETAPA",
  "NUEVO_CONTACTO",
  "EN_SEGUIMIENTO",
  "INTERES_CONFIRMADO",
  "EN_EVALUACION",
  "LISTO_PARA_CERRAR",
] as const;

const ETAPA_LABELS: Record<string, string> = {
  SIN_ETAPA: "Sin Etapa",
  NUEVO_CONTACTO: "Nuevo Contacto",
  EN_SEGUIMIENTO: "En Seguimiento",
  INTERES_CONFIRMADO: "Interés Confirmado",
  EN_EVALUACION: "En Evaluación",
  LISTO_PARA_CERRAR: "Listo para Cerrar",
};

const ETAPA_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  SIN_ETAPA:           { bg: "bg-[#1f2937]/60", text: "text-gray-400",   border: "border-gray-700/40",   dot: "#374151" },
  NUEVO_CONTACTO:      { bg: "bg-blue-950/40",   text: "text-blue-400",  border: "border-blue-900/40",   dot: "#1e3a5f" },
  EN_SEGUIMIENTO:      { bg: "bg-blue-900/30",   text: "text-blue-300",  border: "border-blue-800/40",   dot: "#1e40af" },
  INTERES_CONFIRMADO:  { bg: "bg-emerald-950/40",text: "text-emerald-400",border: "border-emerald-900/40",dot: "#065f46" },
  EN_EVALUACION:       { bg: "bg-amber-950/40",  text: "text-amber-400", border: "border-amber-900/40",  dot: "#78350f" },
  LISTO_PARA_CERRAR:   { bg: "bg-[#B3985B]/10",  text: "text-[#B3985B]", border: "border-[#B3985B]/30",  dot: "#b3985b" },
};

const TIPO_EVENTO_COLORS: Record<string, { bg: string; text: string }> = {
  MUSICAL:     { bg: "bg-[#C9A84C]/15", text: "text-[#C9A84C]" },
  SOCIAL:      { bg: "bg-purple-900/30", text: "text-purple-300" },
  EMPRESARIAL: { bg: "bg-blue-900/30",  text: "text-blue-300" },
  VARIOS:      { bg: "bg-gray-800",     text: "text-gray-400" },
};

const TIPO_EVENTO_LABELS: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", VARIOS: "Varios",
};

const ORIGEN_LABELS: Record<string, string> = {
  META_ADS: "Meta Ads", MANUAL: "Manual", REFERIDO: "Referido", RECOMPRA: "Recompra",
  ORGANICO: "Orgánico", NETWORKING: "Networking", REDES_SOCIALES: "Redes Sociales", OTRO: "Otro",
};

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  EN_TRATO:   { label: "En trato",   className: "bg-purple-900/40 text-purple-300 border border-purple-800/30" },
  CONVERTIDO: { label: "Convertido", className: "bg-emerald-900/40 text-emerald-300 border border-emerald-800/30" },
  CANCELADO:  { label: "Cancelado",  className: "bg-red-900/40 text-red-400 border border-red-800/30" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function progreso(p: Prospeccion): number {
  return [p.contacto1Hecho, p.contacto2Hecho, p.contacto3Hecho, p.contacto4Hecho, p.contacto5Hecho]
    .filter(Boolean).length;
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function isVencido(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

function necesitaAlerta(p: Prospeccion): boolean {
  if (p.estado === 'CANCELADO' || p.estado === 'CONVERTIDO' || p.estado === 'EN_TRATO') return false;
  // Sin fecha de próximo contacto → siempre alerta
  if (!p.fechaProximoContacto) return true;
  // Vencida hace 5+ días
  const diasVencido = Math.floor((Date.now() - new Date(p.fechaProximoContacto).getTime()) / 86400000);
  return diasVencido >= 5;
}

// ─── EtapaDropdown ───────────────────────────────────────────────────────────

function EtapaDropdown({ prospeccionId, etapaActual, onChanged }: {
  prospeccionId: string;
  etapaActual: string;
  onChanged: (nuevaEtapa: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function cambiarEtapa(nuevaEtapa: string) {
    setSaving(true);
    await fetch(`/api/prospeccion/${prospeccionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: nuevaEtapa, estado: "ACTIVO" }),
    });
    onChanged(nuevaEtapa);
    setSaving(false);
    setOpen(false);
  }

  const colors = ETAPA_COLORS[etapaActual] ?? ETAPA_COLORS.SIN_ETAPA;

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={saving}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colors.bg} ${colors.text} ${colors.border} hover:brightness-110 transition-all disabled:opacity-50`}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors.dot }} />
        {ETAPA_LABELS[etapaActual] ?? etapaActual}
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2 4 6 8 10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[200px]">
          {ETAPAS_ORDEN.map(e => {
            const c = ETAPA_COLORS[e];
            return (
              <button key={e} onClick={() => cambiarEtapa(e)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[#1a1a1a] ${e === etapaActual ? c.text + " font-medium" : "text-gray-400"}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.dot }} />
                {ETAPA_LABELS[e]}
                {e === etapaActual && <span className="ml-auto text-[#B3985B]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── FechaProximoDropdown ──────────────────────────────────────────────────────────────

function FechaProximoDropdown({ prospeccionId, fechaActual, vencido, onChanged }: {
  prospeccionId: string;
  fechaActual: string | null;
  vencido: boolean;
  onChanged: (nuevaFecha: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [valor, setValor] = useState(fechaActual ? fechaActual.substring(0, 10) : "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function guardar() {
    setSaving(true);
    const iso = valor ? new Date(`${valor}T12:00:00`).toISOString() : null;
    await fetch(`/api/prospeccion/${prospeccionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fechaProximoContacto: iso }),
    });
    onChanged(iso);
    setSaving(false);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative w-full" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`group/fecha flex items-center gap-1 w-full text-left transition-colors ${
          vencido ? "text-red-400 hover:text-red-300" : fechaActual ? "text-[#777] hover:text-white" : "text-[#2a2a2a] hover:text-[#555]"
        }`}
      >
        <span className="text-[12px] font-medium">{fechaActual ? formatFecha(fechaActual) : "— sin fecha"}</span>
        <svg className="w-2.5 h-2.5 opacity-0 group-hover/fecha:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        {vencido && <span className="text-[9px] text-red-500/60 block leading-none mt-0.5">vencido</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl p-3 min-w-[200px]">
          <p className="text-[9px] text-[#555] uppercase tracking-wider mb-2">Próximo contacto</p>
          <input
            type="date"
            value={valor}
            onChange={e => setValor(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B] mb-2"
          />
          <div className="flex gap-1.5">
            {valor && (
              <button onClick={() => { setValor(""); }}
                className="text-[10px] text-[#555] hover:text-red-400 px-2 py-1 rounded border border-[#1e1e1e] transition-colors">
                Quitar
              </button>
            )}
            <button onClick={guardar} disabled={saving}
              className="flex-1 text-[10px] bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold px-2 py-1 rounded transition-colors disabled:opacity-40">
              {saving ? "…" : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ResponsableDropdown ─────────────────────────────────────────────────────────────

function ResponsableDropdown({ prospeccionId, responsableActual, usuarios, onChanged }: {
  prospeccionId: string;
  responsableActual: { id: string; name: string } | null;
  usuarios: Usuario[];
  onChanged: (responsable: { id: string; name: string } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function asignar(u: Usuario | null) {
    setSaving(true);
    await fetch(`/api/prospeccion/${prospeccionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsableId: u?.id ?? null }),
    });
    onChanged(u);
    setSaving(false);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative w-full" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={saving}
        className="group/resp flex items-center gap-1.5 w-full text-left transition-colors disabled:opacity-50"
      >
        {responsableActual ? (
          <>
            <span className="w-4 h-4 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 flex items-center justify-center text-[8px] text-[#B3985B] shrink-0 font-bold">
              {responsableActual.name.charAt(0).toUpperCase()}
            </span>
            <span className="text-[11px] text-[#888] truncate group-hover/resp:text-white transition-colors">
              {responsableActual.name.split(" ")[0]}
            </span>
            <svg className="w-2.5 h-2.5 text-[#444] opacity-0 group-hover/resp:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </>
        ) : (
          <span className="text-[11px] text-[#2a2a2a] group-hover/resp:text-[#555] transition-colors">— asignar</span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[170px]">
          <p className="text-[9px] text-[#444] uppercase tracking-wider px-3 py-1.5">Responsable</p>
          {responsableActual && (
            <button onClick={() => asignar(null)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-[#555] hover:bg-[#1a1a1a] hover:text-red-400 transition-colors">
              <span className="w-4 h-4 rounded-full border border-[#333] flex items-center justify-center text-[9px]">✕</span>
              Sin asignar
            </button>
          )}
          {usuarios.map(u => (
            <button key={u.id} onClick={() => asignar(u)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[#1a1a1a] ${
                responsableActual?.id === u.id ? "text-[#B3985B]" : "text-gray-300"
              }`}>
              <span className="w-4 h-4 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 flex items-center justify-center text-[8px] text-[#B3985B] shrink-0 font-bold">
                {u.name.charAt(0).toUpperCase()}
              </span>
              {u.name.split(" ").slice(0, 2).join(" ")}
              {responsableActual?.id === u.id && <span className="ml-auto text-[#B3985B]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ModalNuevoSeguimiento ─────────────────────────────────────────────────────────────

const CANAL_ICON: Record<string, string> = { whatsapp: "📱", llamada: "📞", reunion: "🤝" };
const CANAL_LABEL: Record<string, string> = { whatsapp: "WhatsApp", llamada: "Llamada", reunion: "Reunión" };

function ModalNuevoSeguimiento({ tratoId, clienteNombre, onClose, onCreated }: {
  tratoId: string;
  clienteNombre: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [canal, setCanal] = useState("whatsapp");
  const [fecha, setFecha] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().substring(0, 10); });
  const [hora, setHora] = useState("10:00");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!titulo) return;
    setSaving(true);
    await fetch("/api/seguimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tratoId,
        titulo,
        canal,
        fechaProgramada: new Date(`${fecha}T${hora}:00`).toISOString(),
      }),
    });
    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#111] border border-[#222] rounded-2xl p-5 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Nuevo seguimiento</h3>
            <p className="text-[#555] text-[11px] mt-0.5">{clienteNombre}</p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Título *</label>
            <input autoFocus value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="ej: Llamar para confirmar interés"
              onKeyDown={e => e.key === "Enter" && save()}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Hora</label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>
          <div>
            <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Canal</label>
            <div className="flex gap-1.5">
              {["whatsapp", "llamada", "reunion"].map(c => (
                <button key={c} onClick={() => setCanal(c)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${
                    canal === c ? "bg-[#B3985B] border-[#B3985B] text-black" : "bg-[#0d0d0d] border-[#2a2a2a] text-[#666] hover:text-white"
                  }`}>
                  {CANAL_ICON[c]} {CANAL_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2 rounded-xl text-xs font-semibold border border-[#2a2a2a] text-[#555] hover:text-white transition-colors">
              Cancelar
            </button>
            <button onClick={save} disabled={saving || !titulo}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black transition-colors">
              {saving ? "Creando…" : "Crear seguimiento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ProspeccionRow ─────────────────────────────────────────────────────────────────────

const CONTACTO_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: "Contacto 1", desc: "Primer contacto — presentación inicial" },
  2: { label: "Contacto 2", desc: "Seguimiento — verificar recepción" },
  3: { label: "Contacto 3", desc: "Profundizar necesidad" },
  4: { label: "Contacto 4", desc: "Presentar propuesta de valor" },
  5: { label: "Contacto 5", desc: "Definición — ¿hay intención de compra?" },
};

function ProspeccionRow({ p, usuarios, onEtapaChange, onDelete, onUpdate }: {
  p: Prospeccion;
  usuarios: Usuario[];
  onEtapaChange: (id: string, etapa: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Prospeccion>) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const evtColors = TIPO_EVENTO_COLORS[p.tipoEvento] ?? TIPO_EVENTO_COLORS.VARIOS;
  const estadoBadge = ESTADO_BADGE[p.estado];
  const alerta = necesitaAlerta(p);

  const [fechaProximo, setFechaProximo] = useState(p.fechaProximoContacto);
  const [responsable, setResponsable] = useState(p.responsable);
  const [contactos, setContactos] = useState({
    1: p.contacto1Hecho, 2: p.contacto2Hecho, 3: p.contacto3Hecho,
    4: p.contacto4Hecho, 5: p.contacto5Hecho,
  });
  const [expandido, setExpandido] = useState(false);
  const [savingContacto, setSavingContacto] = useState<number | null>(null);
  const [abriendo, setAbriendo] = useState(false);
  const [modalSeguimiento, setModalSeguimiento] = useState(false);

  const prog = Object.values(contactos).filter(Boolean).length;
  const proximoVencido = isVencido(fechaProximo);

  async function toggleContacto(n: number) {
    const nuevo = !contactos[n as keyof typeof contactos];
    setContactos(prev => ({ ...prev, [n]: nuevo }));
    setSavingContacto(n);
    try {
      await fetch(`/api/prospeccion/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [`contacto${n}Hecho`]: nuevo }),
      });
    } finally { setSavingContacto(null); }
  }

  async function abrirTrato() {
    if (abriendo) return;
    setAbriendo(true);
    try {
      const res = await fetch(`/api/prospeccion/${p.id}/generar-trato`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.trato?.id) router.push(`/crm/tratos/${data.trato.id}`);
      else if (res.status === 409 && data.tratoId) router.push(`/crm/tratos/${data.tratoId}`);
      else alert(data.error ?? "Error al abrir el trato");
    } finally { setAbriendo(false); }
  }

  const tieneTratoActivo = p.estado === "EN_TRATO" || !!p.trato;

  return (
    <>
      <div className={`group flex items-center border-b border-[#0f0f0f] last:border-0 transition-colors ${
        alerta ? "bg-red-950/10 hover:bg-red-950/15" : "hover:bg-[#0b0b0b]"
      }`}>
        <button
          onClick={() => setExpandido(v => !v)}
          className="shrink-0 w-10 self-stretch flex items-center justify-center text-[#252525] hover:text-gray-500 transition-colors"
          title="Ver ruta de 5 contactos"
        >
          <svg className={`w-3 h-3 transition-transform ${expandido ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="flex-[3] min-w-0 py-3 pr-4">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: alerta ? "#ef4444" : (ETAPA_COLORS[p.etapa]?.dot ?? "#374151") }} />
            <Link href={`/crm/prospeccion/${p.id}`} className="text-[14px] text-white font-semibold leading-tight truncate hover:text-[#B3985B] transition-colors">
              {p.cliente.nombre}
            </Link>
            {estadoBadge && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${estadoBadge.className}`}>
                {estadoBadge.label}
              </span>
            )}
            {alerta && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-red-900/40 text-red-400 border border-red-800/40 shrink-0">⚠</span>
            )}
          </div>
          {p.cliente.empresa && (
            <p className="text-[11px] text-[#444] mt-0.5 truncate pl-3">{p.cliente.empresa}</p>
          )}
        </div>
        <div className="hidden sm:flex w-[160px] shrink-0 pr-3 items-center">
          <EtapaDropdown
            prospeccionId={p.id}
            etapaActual={p.etapa}
            onChanged={nuevaEtapa => onEtapaChange(p.id, nuevaEtapa)}
          />
        </div>
        <div className="hidden md:flex w-[105px] shrink-0 pr-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${evtColors.bg} ${evtColors.text}`}>
            {TIPO_EVENTO_LABELS[p.tipoEvento] ?? p.tipoEvento}
          </span>
        </div>
        <div className="hidden lg:block w-[130px] shrink-0 pr-3">
          <FechaProximoDropdown
            prospeccionId={p.id}
            fechaActual={fechaProximo}
            vencido={proximoVencido}
            onChanged={nueva => {
              setFechaProximo(nueva);
              onUpdate(p.id, { fechaProximoContacto: nueva });
            }}
          />
        </div>
        <div className="hidden lg:flex w-[110px] shrink-0 pr-3 items-center">
          <ResponsableDropdown
            prospeccionId={p.id}
            responsableActual={responsable}
            usuarios={usuarios}
            onChanged={nuevo => {
              setResponsable(nuevo);
              onUpdate(p.id, { responsable: nuevo });
            }}
          />
        </div>
        <div className="hidden xl:flex w-[76px] shrink-0 pr-3 items-center gap-1.5">
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(n => (
              <div key={n} className={`w-2 h-2 rounded-full border transition-colors ${
                contactos[n as keyof typeof contactos] ? "bg-[#B3985B] border-[#B3985B]" : "bg-transparent border-[#2a2a2a]"
              }`} />
            ))}
          </div>
          <span className="text-[10px] text-[#444]">{prog}/5</span>
        </div>
        <div className="flex items-center gap-1 w-[72px] shrink-0 justify-end pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {tieneTratoActivo ? (
            p.trato ? (
              <Link href={`/crm/tratos/${p.trato.id}`}
                className="text-[10px] text-purple-400 hover:text-purple-300 border border-purple-900/40 rounded-md px-1.5 py-0.5 transition-colors whitespace-nowrap">
                Ver trato
              </Link>
            ) : null
          ) : (
            <button
              onClick={e => { e.stopPropagation(); abrirTrato(); }}
              disabled={abriendo}
              className="text-[10px] text-[#B3985B]/70 hover:text-[#B3985B] border border-[#1e1e1e] hover:border-[#B3985B]/30 rounded-md px-1.5 py-0.5 transition-colors whitespace-nowrap disabled:opacity-40"
              title="Convertir a Trato"
            >
              {abriendo ? "…" : "🎯 Trato"}
            </button>
          )}
          <button onClick={() => onDelete(p.id)}
            className="text-[#222] hover:text-red-500/50 transition-colors p-1 rounded"
            title="Eliminar">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>
      {expandido && (
        <div className="bg-[#070707] border-b border-[#0f0f0f]">
          <div className="ml-10 mr-3 py-3">
            <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
              {[1,2,3,4,5].map(n => {
                const hecho = contactos[n as keyof typeof contactos];
                const meta = CONTACTO_LABELS[n];
                const isSaving = savingContacto === n;
                return (
                  <button key={n} onClick={() => toggleContacto(n)} disabled={isSaving}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-[#1a1a1a] last:border-0 transition-colors ${
                      hecho ? "bg-[#B3985B]/5 hover:bg-[#B3985B]/10" : "bg-[#0d0d0d] hover:bg-[#141414]"
                    } ${isSaving ? "opacity-50" : ""}`}
                  >
                    <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                      hecho ? "bg-[#B3985B] border-[#B3985B]" : "border-[#333] bg-transparent"
                    }`}>
                      {hecho && <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="black" strokeWidth="2.5"><polyline points="2 6 5 9 10 3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${hecho ? "text-[#B3985B] line-through opacity-70" : "text-white"}`}>{meta.label}</p>
                      <p className="text-[10px] text-[#555] truncate">{meta.desc}</p>
                    </div>
                    {isSaving && <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                  </button>
                );
              })}
              <div className="px-4 py-2.5 bg-[#0a0a0a] border-t border-[#1e1e1e] flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] text-[#444]">{prog} de 5 completados</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botón + Seguimiento */}
                  {p.trato && (
                    <button
                      onClick={e => { e.stopPropagation(); setModalSeguimiento(true); }}
                      className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#B3985B] border border-[#1e1e1e] hover:border-[#B3985B]/30 rounded-md px-2 py-1 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        <line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
                      </svg>
                      + Seguimiento
                    </button>
                  )}
                  {tieneTratoActivo ? (
                    p.trato ? (
                      <Link href={`/crm/tratos/${p.trato.id}`} className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" /> Ver trato →
                      </Link>
                    ) : <span className="text-xs text-purple-400 opacity-60">En trato…</span>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); abrirTrato(); }} disabled={abriendo}
                      className="flex items-center gap-2 text-xs text-[#B3985B] hover:text-[#c9a96a] font-medium transition-colors disabled:opacity-50">
                      {abriendo
                        ? <><div className="w-3 h-3 border border-[#B3985B] border-t-transparent rounded-full animate-spin" /> Abriendo…</>
                        : <><span className="text-sm">🎯</span> Abrir Trato</>
                      }
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nuevo seguimiento */}
      {modalSeguimiento && p.trato && (
        <ModalNuevoSeguimiento
          tratoId={p.trato.id}
          clienteNombre={p.cliente.nombre}
          onClose={() => setModalSeguimiento(false)}
          onCreated={() => toast.success("Seguimiento creado ✓")}
        />
      )}
    </>
  );
}

// ─── ModalNuevoProspecto ──────────────────────────────────────────────────────

function ModalNuevoProspecto({ usuarios, tipo, onClose, onCreated }: {
  usuarios: Usuario[];
  tipo: "NUEVO_PROSPECTO" | "CLIENTE_PROPIO";
  onClose: () => void;
  onCreated: (p: Prospeccion) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [clienteResults, setClienteResults] = useState<{ id: string; nombre: string; empresa: string | null; tipoCliente: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<{ id: string; nombre: string } | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    correo: "",
    empresa: "",
    tipoEvento: "VARIOS",
    origen: tipo === "NUEVO_PROSPECTO" ? "MANUAL" : "RECOMPRA",
    responsableId: "",
    fechaProximoContacto: "",
    notas: "",
  });

  useEffect(() => {
    if (!search.trim() || search.length < 2) { setClienteResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const qs = tipo === "CLIENTE_PROPIO" ? `&tipoCliente=B2C,B2B` : "";
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(search.trim())}&limit=6${qs}`);
        const d = await res.json();
        setClienteResults(d.clientes ?? []);
      } catch { setClienteResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [search, tipo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        tipo,
        tipoEvento: form.tipoEvento,
        origen: form.origen,
        responsableId: form.responsableId || null,
        notas: form.notas || null,
        fechaProximoContacto: form.fechaProximoContacto || null,
        etapa: "NUEVO_CONTACTO",
        estado: "ACTIVO",
      };
      if (clienteSeleccionado) {
        body.clienteId = clienteSeleccionado.id;
      } else {
        body.nombre = form.nombre;
        body.telefono = form.telefono || null;
        body.correo = form.correo || null;
        body.empresa = form.empresa || null;
      }
      const res = await fetch("/api/prospeccion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      onCreated(d.prospeccion);
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  }

  const tipoEventoOpts = [
    { value: "MUSICAL", label: "Musical" },
    { value: "SOCIAL", label: "Social" },
    { value: "EMPRESARIAL", label: "Empresarial" },
    { value: "VARIOS", label: "Varios" },
  ];
  const origenOpts = tipo === "NUEVO_PROSPECTO"
    ? [
        { value: "MANUAL", label: "Manual" }, { value: "REFERIDO", label: "Referido" },
        { value: "ORGANICO", label: "Orgánico" }, { value: "REDES_SOCIALES", label: "Redes Sociales" },
        { value: "NETWORKING", label: "Networking" }, { value: "OTRO", label: "Otro" },
      ]
    : [
        { value: "RECOMPRA", label: "Recompra" }, { value: "REFERIDO", label: "Referido" },
        { value: "OTRO", label: "Otro" },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <div>
            <h2 className="text-white font-semibold text-sm">
              {tipo === "NUEVO_PROSPECTO" ? "Nuevo Contacto" : "Agregar Cliente Existente"}
            </h2>
            <p className="text-[#555] text-xs mt-0.5">
              {tipo === "NUEVO_PROSPECTO" ? "Contacto nuevo en la ruta de prospección" : "Cliente existente al que buscamos cerrar una nueva venta"}
            </p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">
              {tipo === "CLIENTE_PROPIO" ? "Buscar cliente existente *" : "Buscar contacto existente"}
            </label>
            <div className="relative">
              <input
                value={clienteSeleccionado ? clienteSeleccionado.nombre : search}
                onChange={e => { setSearch(e.target.value); setClienteSeleccionado(null); }}
                placeholder={tipo === "CLIENTE_PROPIO" ? "Nombre del cliente..." : "Buscar por nombre..."}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
              />
              {clienteSeleccionado && (
                <button type="button" onClick={() => { setClienteSeleccionado(null); setSearch(""); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
            {!clienteSeleccionado && search.trim() && (
              <div className="mt-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                {searching && <p className="text-xs text-[#555] px-3 py-2">Buscando...</p>}
                {!searching && clienteResults.length === 0 && (
                  <p className="text-xs text-[#555] px-3 py-2">Sin resultados</p>
                )}
                {clienteResults.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => { setClienteSeleccionado({ id: c.id, nombre: c.nombre }); setSearch(""); }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#1a1a1a] transition-colors flex items-center justify-between">
                    <span>{c.nombre}</span>
                    {c.empresa && <span className="text-[#555]">{c.empresa}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!clienteSeleccionado && tipo === "NUEVO_PROSPECTO" && (
            <>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Nombre completo *</label>
                  <input
                    required={!clienteSeleccionado}
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
                    placeholder="Nombre del contacto"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Teléfono</label>
                    <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
                      placeholder="55 1234 5678" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Correo</label>
                    <input type="email" value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))}
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
                      placeholder="correo@ejemplo.com" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Empresa</label>
                  <input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
                    placeholder="Empresa (opcional)" />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Tipo de evento *</label>
              <Combobox
                value={form.tipoEvento}
                onChange={v => setForm(f => ({ ...f, tipoEvento: v }))}
                options={tipoEventoOpts}
                placeholder="Tipo de evento"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Origen *</label>
              <Combobox
                value={form.origen}
                onChange={v => setForm(f => ({ ...f, origen: v }))}
                options={origenOpts}
                placeholder="Origen"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Responsable *</label>
              <Combobox
                value={form.responsableId}
                onChange={v => setForm(f => ({ ...f, responsableId: v }))}
                options={[{ value: "", label: "Sin asignar" }, ...usuarios.map(u => ({ value: u.id, label: u.name.split(" ").slice(0, 2).join(" ") }))]}
                placeholder="Responsable"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Próximo contacto</label>
              <input type="date" value={form.fechaProximoContacto} onChange={e => setForm(f => ({ ...f, fechaProximoContacto: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Notas iniciales</label>
            <textarea
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              rows={2}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50 resize-none"
              placeholder="Notas iniciales sobre el contacto..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-[#777] border border-[#2a2a2a] rounded-lg hover:text-white hover:border-[#444] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || (tipo === "CLIENTE_PROPIO" && !clienteSeleccionado)}
              className="flex-1 px-4 py-2 text-sm bg-[#B3985B] text-black font-semibold rounded-lg hover:bg-[#C9A84C] disabled:opacity-50 transition-colors">
              {saving ? "Creando..." : tipo === "NUEVO_PROSPECTO" ? "Crear contacto" : "Agregar cliente existente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type CountItem = { etapa: string; tipo: string; estado: string; _count: { id: number } };

export default function ProspeccionClient({
  usuarios,
  serverCounts,
}: {
  usuarios: Usuario[];
  serverCounts: CountItem[];
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"NUEVO_PROSPECTO" | "CLIENTE_PROPIO">("NUEVO_PROSPECTO");
  const [showModal, setShowModal] = useState(false);
  const [prospecciones, setProspecciones] = useState<Prospeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Filters
  const [busqueda, setBusqueda] = useState("");
  const [filtroEvento, setFiltroEvento] = useState("");
  const [filtroResponsable, setFiltroResponsable] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");

  // Load data
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showAll) params.set("showAll", "true");
      const res = await fetch(`/api/prospeccion?${params}`);
      if (res.ok) {
        const d = await res.json();
        setProspecciones(d.prospecciones ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [showAll]);

  useEffect(() => { cargar(); }, [cargar]);

  // Filtered + grouped
  const filtradas = useMemo(() => {
    return prospecciones.filter(p => {
      if (p.tipo !== activeTab) return false;
      if (!showAll && (p.estado === "CONVERTIDO" || p.estado === "CANCELADO")) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!p.cliente.nombre.toLowerCase().includes(q) && !(p.cliente.empresa ?? "").toLowerCase().includes(q)) return false;
      }
      if (filtroEvento && p.tipoEvento !== filtroEvento) return false;
      if (filtroResponsable) {
        if (filtroResponsable === "__sin__" && p.responsable !== null) return false;
        if (filtroResponsable !== "__sin__" && p.responsable?.id !== filtroResponsable) return false;
      }
      if (filtroOrigen && p.origen !== filtroOrigen) return false;
      return true;
    });
  }, [prospecciones, activeTab, showAll, busqueda, filtroEvento, filtroResponsable, filtroOrigen]);


  // Total counts from server for tab badges
  const totalNuevo = serverCounts.filter(c => c.tipo === "NUEVO_PROSPECTO").reduce((a, c) => a + c._count.id, 0);
  const totalPropio = serverCounts.filter(c => c.tipo === "CLIENTE_PROPIO").reduce((a, c) => a + c._count.id, 0);

  function handleEtapaChange(id: string, etapa: string) {
    setProspecciones(prev => prev.map(p => p.id === id ? { ...p, etapa, estado: "ACTIVO" } : p));
  }

  async function handleDelete(id: string) {
    if (!await confirm({ message: "¿Eliminar este contacto? Esta acción no se puede deshacer.", danger: true, confirmText: "Eliminar" })) return;
    const r = await fetch(`/api/prospeccion/${id}`, { method: "DELETE" });
    if (r.ok) {
      setProspecciones(prev => prev.filter(p => p.id !== id));
      toast.success("Contacto eliminado");
    } else {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
    }
  }

  function handleCreated(p: Prospeccion) {
    setProspecciones(prev => [p, ...prev]);
    toast.success("Contacto creado");
  }

  const hayFiltros = busqueda || filtroEvento || filtroResponsable || filtroOrigen;

  const vendedorOptions = [
    { value: "", label: "Todos" },
    { value: "__sin__", label: "Sin asignar" },
    ...usuarios.map(u => ({ value: u.id, label: u.name.split(" ").slice(0, 2).join(" ") })),
  ];

  return (
    <>
      {showModal && (
        <ModalNuevoProspecto
          usuarios={usuarios}
          tipo={activeTab}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Prospección</h1>
          <p className="text-[#6b7280] text-sm">
            {filtradas.length} {hayFiltros ? <><span className="text-[#444]">de {prospecciones.filter(p => p.tipo === activeTab).length}</span></> : ""} contactos activos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAll(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showAll ? "bg-[#B3985B]/10 border-[#B3985B]/30 text-[#B3985B]" : "border-[#2a2a2a] text-[#555] hover:border-[#444] hover:text-[#aaa]"}`}
          >
            {showAll ? "Ocultar cerrados" : "Ver todos"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#B3985B] hover:bg-[#C9A84C] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors"
          >
            {activeTab === "NUEVO_PROSPECTO" ? "+ Nuevo contacto" : "+ Cliente existente"}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 mb-5 bg-[#111] border border-[#1e1e1e] rounded-xl p-1 w-fit">
        {([
          { key: "NUEVO_PROSPECTO", label: "Contactos Nuevos", count: totalNuevo },
          { key: "CLIENTE_PROPIO", label: "Clientes Existentes", count: totalPropio },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-[#B3985B] text-black"
                : "text-[#6b7280] hover:text-white"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              activeTab === tab.key ? "bg-black/20 text-black" : "bg-[#1e1e1e] text-[#555]"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por nombre o empresa…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#B3985B]/50 transition-colors" />
          {busqueda && <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-white"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
        </div>
        <Combobox value={filtroEvento} onChange={setFiltroEvento}
          options={[{ value: "", label: "Evento" }, { value: "MUSICAL", label: "Musical" }, { value: "SOCIAL", label: "Social" }, { value: "EMPRESARIAL", label: "Empresarial" }, { value: "VARIOS", label: "Varios" }]}
          placeholder="Evento"
          className={`px-3 py-1.5 rounded-lg text-xs border transition-colors focus:outline-none ${filtroEvento ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        <Combobox value={filtroResponsable} onChange={setFiltroResponsable}
          options={vendedorOptions}
          placeholder="Responsable"
          className={`px-3 py-1.5 rounded-lg text-xs border transition-colors focus:outline-none ${filtroResponsable ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        <Combobox value={filtroOrigen} onChange={setFiltroOrigen}
          options={[{ value: "", label: "Origen" }, ...Object.entries(ORIGEN_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
          placeholder="Origen"
          className={`px-3 py-1.5 rounded-lg text-xs border transition-colors focus:outline-none ${filtroOrigen ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        {hayFiltros && (
          <button onClick={() => { setBusqueda(""); setFiltroEvento(""); setFiltroResponsable(""); setFiltroOrigen(""); }}
            className="text-[10px] text-[#555] hover:text-red-400 border border-[#2a2a2a] hover:border-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors">
            Limpiar
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="py-20 text-center text-[#444] text-sm">Cargando contactos…</div>
      ) : filtradas.length === 0 ? (
        <div className="py-20 text-center border border-[#1a1a1a] border-dashed rounded-xl">
          <p className="text-[#444] text-sm">
            {hayFiltros ? "Sin resultados para los filtros aplicados" : `No hay ${activeTab === "NUEVO_PROSPECTO" ? "contactos nuevos" : "clientes existentes"} activos`}
          </p>
          <button onClick={() => setShowModal(true)} className="mt-4 text-[#B3985B] text-xs hover:underline">
            + Agregar {activeTab === "NUEVO_PROSPECTO" ? "contacto" : "cliente existente"}
          </button>
        </div>
      ) : (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="hidden md:flex items-center border-b border-[#111] px-0 py-1.5 text-[9px] uppercase tracking-[0.14em] text-[#3a3a3a]">
            <div className="w-10 shrink-0" />
            <div className="flex-[3] min-w-0 pr-4">Nombre</div>
            <div className="hidden sm:block w-[160px] shrink-0 pr-3">Clasificación</div>
            <div className="hidden md:block w-[105px] shrink-0 pr-3">Tipo evento</div>
            <div className="hidden lg:block w-[130px] shrink-0 pr-3">Próx. contacto</div>
            <div className="hidden lg:block w-[110px] shrink-0 pr-3">Responsable</div>
            <div className="hidden xl:block w-[76px] shrink-0 pr-3">Ruta</div>
            <div className="w-[72px] shrink-0" />
          </div>
          {/* Rows */}
          {filtradas.map(p => (
            <ProspeccionRow
              key={p.id}
              p={p}
              usuarios={usuarios}
              onEtapaChange={handleEtapaChange}
              onDelete={handleDelete}
              onUpdate={(id, patch) => setProspecciones(prev =>
                prev.map(x => x.id === id ? { ...x, ...patch } : x)
              )}
            />
          ))}
        </div>
      )}
    </>
  );
}
