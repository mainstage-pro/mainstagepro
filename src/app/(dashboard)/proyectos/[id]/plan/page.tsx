"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

type PersonalItem = { id: string; nombre: string; rol: string; confirmado: boolean; telefono?: string | null };
type EquipoItem = { id: string; nombre: string; cantidad: number };

type Plan = {
  objetivoEvento: string;
  briefingProduccion: string;
  encargadoProduccion: string;
  encargadoProduccionTel: string;
  encargadoLugar: string;
  encargadoLugarTel: string;
  horaLlegada: string;
  rutaTransporte: string;
  vehiculo: string;
  montajeInicio: string;
  montajeFin: string;
  soundcheckHora: string;
  cronogramaDia: string;
  equipoEspecial: string;
  proveedoresExternos: string;
  alimentacion: string;
  hospedaje: string;
  notasFinales: string;
};

const PLAN_DEFAULT: Plan = {
  objetivoEvento: "",
  briefingProduccion: "",
  encargadoProduccion: "",
  encargadoProduccionTel: "",
  encargadoLugar: "",
  encargadoLugarTel: "",
  horaLlegada: "",
  rutaTransporte: "",
  vehiculo: "",
  montajeInicio: "",
  montajeFin: "",
  soundcheckHora: "",
  cronogramaDia: "",
  equipoEspecial: "",
  proveedoresExternos: "",
  alimentacion: "",
  hospedaje: "",
  notasFinales: "",
};

function Field({ label, value, onChange, placeholder, multiline, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; required?: boolean;
}) {
  const cls = "w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50";
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#555] uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={`${cls} resize-none`} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

type VehiculoItem = { id: string; nombre: string; marca?: string | null; placas?: string | null; color?: string | null };

function VehiculoSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [vehiculos, setVehiculos] = useState<VehiculoItem[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newMarca, setNewMarca] = useState("");
  const [newPlacas, setNewPlacas] = useState("");
  const [newColor, setNewColor] = useState("");

  useEffect(() => {
    fetch("/api/vehiculos")
      .then(r => r.json())
      .then(d => setVehiculos(d.vehiculos ?? []))
      .catch(() => {});
  }, []);

  const cls = "w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50";

  const filtered = vehiculos.filter(v => {
    const q = search.toLowerCase();
    return !q || v.nombre.toLowerCase().includes(q) ||
      (v.marca ?? "").toLowerCase().includes(q) ||
      (v.placas ?? "").toLowerCase().includes(q);
  });

  function displayName(v: VehiculoItem) {
    const parts = [v.nombre];
    if (v.placas) parts.push(`(${v.placas})`);
    return parts.join(" ");
  }

  async function handleCrearVehiculo() {
    if (!newNombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newNombre.trim(),
          marca: newMarca.trim() || null,
          placas: newPlacas.trim() || null,
          color: newColor.trim() || null,
        }),
      });
      const d = await res.json();
      if (res.ok && d.vehiculo) {
        const v = d.vehiculo as VehiculoItem;
        setVehiculos(prev => [...prev, v].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        onChange(displayName(v));
        setOpen(false);
        setShowNew(false);
        setNewNombre(""); setNewMarca(""); setNewPlacas(""); setNewColor("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      <label className="block text-[11px] font-bold text-[#555] uppercase tracking-wider mb-1.5">
        Vehículo / Transporte
      </label>

      {/* Campo principal */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(v => !v); setShowNew(false); }}
          className={`flex-1 ${cls} text-left flex items-center justify-between`}
        >
          <span className={value ? "text-white" : "text-[#333]"}>
            {value || "Seleccionar o registrar vehículo..."}
          </span>
          <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="px-3 py-2 text-gray-600 hover:text-gray-400 bg-[#0d0d0d] border border-[#222] rounded-xl transition-colors text-xs"
            title="Limpiar"
          >✕</button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#111] border border-[#222] rounded-xl overflow-hidden shadow-2xl">
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar vehículo..."
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
            />
          </div>

          {/* Lista */}
          <div className="max-h-48 overflow-y-auto divide-y divide-[#1a1a1a]">
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-600">Sin resultados</p>
            )}
            {filtered.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => { onChange(displayName(v)); setOpen(false); setSearch(""); }}
                className="w-full text-left px-4 py-2.5 hover:bg-[#1a1a1a] transition-colors"
              >
                <p className="text-white text-sm">{v.nombre}</p>
                <p className="text-gray-500 text-xs">
                  {[v.marca, v.color, v.placas ? `Placas: ${v.placas}` : null].filter(Boolean).join(" · ")}
                </p>
              </button>
            ))}
          </div>

          {/* Registrar nuevo */}
          <div className="border-t border-[#1a1a1a]">
            {!showNew ? (
              <button
                type="button"
                onClick={() => setShowNew(true)}
                className="w-full text-left px-4 py-3 text-[#B3985B] hover:bg-[#1a1a1a] text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Registrar nuevo vehículo
              </button>
            ) : (
              <div className="p-3 space-y-2 bg-[#0d0d0d]">
                <p className="text-[10px] font-bold text-[#B3985B] uppercase tracking-wider mb-2">Nuevo vehículo</p>
                <input
                  type="text" value={newNombre} onChange={e => setNewNombre(e.target.value)}
                  placeholder="Nombre identificador * (ej: Sprinter Negra)"
                  className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={newMarca} onChange={e => setNewMarca(e.target.value)}
                    placeholder="Marca (ej: Mercedes)"
                    className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50" />
                  <input type="text" value={newColor} onChange={e => setNewColor(e.target.value)}
                    placeholder="Color"
                    className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50" />
                </div>
                <input type="text" value={newPlacas} onChange={e => setNewPlacas(e.target.value)}
                  placeholder="Placas (opcional)"
                  className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50" />
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowNew(false)}
                    className="flex-1 text-xs text-gray-500 hover:text-gray-300 py-2 rounded-lg border border-[#222] transition-colors">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleCrearVehiculo} disabled={!newNombre.trim() || saving}
                    className="flex-1 text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black py-2 rounded-lg transition-colors">
                    {saving ? "Guardando..." : "Registrar y usar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlanProduccionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [proyecto, setProyecto] = useState<{
    nombre: string; numeroProyecto: string; fechaEvento: string; lugarEvento?: string | null;
    estado: string; planProduccion: string | null; planProduccionAprobado: boolean;
    planProduccionAprobadoEn: string | null;
    personal: PersonalItem[]; equipos: EquipoItem[];
    transportes?: string | null; cronograma?: string | null;
    encargadoLugar?: string | null; encargadoLugarContacto?: string | null;
    contactosEmergencia?: string | null;
  } | null>(null);

  const [plan, setPlan] = useState<Plan>(PLAN_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aprobando, setAprobando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/proyectos/${id}`);
    const d = await r.json();
    const p = d.proyecto;
    setProyecto(p);
    if (p?.planProduccion) {
      try {
        const stored = JSON.parse(p.planProduccion);
        setPlan({ ...PLAN_DEFAULT, ...stored });
      } catch { /* noop */ }
    } else {
      // Pre-rellenar con datos existentes del proyecto
      setPlan(prev => ({
        ...prev,
        encargadoLugar: p?.encargadoLugar ?? "",
        encargadoLugarTel: p?.encargadoLugarContacto ?? "",
        rutaTransporte: p?.transportes ?? "",
        cronogramaDia: p?.cronograma ?? "",
        notasFinales: p?.contactosEmergencia ?? "",
      }));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    setSaving(true);
    const r = await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planProduccion: JSON.stringify(plan) }),
    });
    if (r.ok) {
      toast.success("Plan guardado");
      await cargar();
    } else {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const aprobar = async () => {
    if (!proyecto) return;
    const horasAntes = proyecto.fechaEvento
      ? (new Date(proyecto.fechaEvento).getTime() - Date.now()) / 3600000
      : 9999;

    if (horasAntes < 0) {
      toast.error("El evento ya ocurrió");
      return;
    }

    setAprobando(true);
    // Guardar el plan primero
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planProduccion: JSON.stringify(plan), planProduccionAprobado: true }),
    });
    toast.success("Plan de producción aprobado");
    await cargar();
    setAprobando(false);
  };

  if (loading) {
    return <div className="p-6 text-center text-[#444] text-sm">Cargando plan...</div>;
  }

  if (!proyecto) {
    return <div className="p-6 text-center text-[#444]">Proyecto no encontrado</div>;
  }

  const ahora = Date.now();
  const msEvento = new Date(proyecto.fechaEvento).getTime();
  const horasRestantes = (msEvento - ahora) / 3600000;
  const diasRestantes = horasRestantes / 24;

  const esInminente = horasRestantes >= 0 && horasRestantes <= 72;
  const esAprobado = proyecto.planProduccionAprobado;

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const personalConfirmado = proyecto.personal.filter(p => p.confirmado);
  const personalPendiente = proyecto.personal.filter(p => !p.confirmado);

  const requiredOk = plan.briefingProduccion.trim().length > 0
    && plan.encargadoProduccion.trim().length > 0
    && plan.horaLlegada.trim().length > 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/proyectos/${id}`} className="text-[#555] hover:text-white text-xs transition-colors">
              ← {proyecto.numeroProyecto}
            </Link>
            <span className="text-[#333]">/</span>
            <span className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">Plan de Producción</span>
          </div>
          <h1 className="text-white text-2xl font-bold">{proyecto.nombre}</h1>
          <p className="text-[#666] text-sm mt-1">{fmtDate(proyecto.fechaEvento)}</p>
        </div>
        <div className="shrink-0 text-right">
          {esAprobado ? (
            <div className="bg-green-900/30 border border-green-800/50 rounded-xl px-4 py-2 text-center">
              <p className="text-green-400 text-sm font-bold">Plan aprobado</p>
              {proyecto.planProduccionAprobadoEn && (
                <p className="text-green-600 text-[10px] mt-0.5">
                  {new Date(proyecto.planProduccionAprobadoEn).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          ) : (
            <div className={`rounded-xl px-4 py-2 text-center border ${
              esInminente ? "bg-red-950/30 border-red-900/50" : "bg-[#111] border-[#1e1e1e]"
            }`}>
              <p className={`text-sm font-bold ${esInminente ? "text-red-400" : "text-[#B3985B]"}`}>
                {horasRestantes < 0 ? "Evento pasado" : diasRestantes >= 1 ? `${Math.floor(diasRestantes)}d restantes` : `${Math.round(horasRestantes)}h restantes`}
              </p>
              <p className="text-[#555] text-[10px] mt-0.5">
                {esInminente ? "¡Aprueba el plan ahora!" : "Límite: 72h antes"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Alerta 72h */}
      {!esAprobado && esInminente && (
        <div className="bg-red-950/20 border border-red-800/50 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl shrink-0">⚠</span>
          <div>
            <p className="text-red-400 font-bold text-sm">Plan no aprobado — evento en menos de 72 horas</p>
            <p className="text-red-300/70 text-xs mt-0.5">
              Completa y aprueba el plan de producción para que el equipo tenga claridad operativa.
            </p>
          </div>
        </div>
      )}

      {/* Resumen de personal y equipos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[10px] font-bold text-[#555] uppercase tracking-wider mb-3">Personal</p>
          {proyecto.personal.length === 0 ? (
            <p className="text-[#444] text-xs">Sin personal asignado</p>
          ) : (
            <div className="space-y-1.5">
              {proyecto.personal.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">{p.nombre}</p>
                    <p className="text-[#555] text-[10px]">{p.rol}</p>
                  </div>
                  <span className={`text-[10px] font-bold ${p.confirmado ? "text-green-400" : "text-yellow-400"}`}>
                    {p.confirmado ? "Confirmado" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          )}
          {personalPendiente.length > 0 && (
            <p className="text-yellow-500 text-[10px] mt-2">{personalPendiente.length} pendiente(s) de confirmar</p>
          )}
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[10px] font-bold text-[#555] uppercase tracking-wider mb-3">Equipos asignados</p>
          {proyecto.equipos.length === 0 ? (
            <p className="text-[#444] text-xs">Sin equipos asignados</p>
          ) : (
            <div className="space-y-1.5">
              {proyecto.equipos.slice(0, 6).map(e => (
                <div key={e.id} className="flex items-center justify-between">
                  <p className="text-white text-sm">{e.nombre}</p>
                  <span className="text-[#555] text-xs">×{e.cantidad}</span>
                </div>
              ))}
              {proyecto.equipos.length > 6 && (
                <p className="text-[#444] text-xs">+{proyecto.equipos.length - 6} más</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Formulario del plan */}
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest mb-4">BRIEFING DE PRODUCCIÓN</p>
          <div className="space-y-4">
            <Field
              label="Objetivo del evento"
              value={plan.objetivoEvento}
              onChange={v => setPlan(p => ({ ...p, objetivoEvento: v }))}
              placeholder="Qué se espera lograr, tipo de evento, tono..."
              multiline
            />
            <Field
              label="Briefing general para el equipo de producción"
              required
              value={plan.briefingProduccion}
              onChange={v => setPlan(p => ({ ...p, briefingProduccion: v }))}
              placeholder="Instrucciones clave, expectativas del cliente, puntos críticos a cuidar..."
              multiline
            />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest mb-4">RESPONSABLES</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Encargado de producción" required value={plan.encargadoProduccion}
              onChange={v => setPlan(p => ({ ...p, encargadoProduccion: v }))} placeholder="Nombre del encargado principal" />
            <Field label="Teléfono" value={plan.encargadoProduccionTel}
              onChange={v => setPlan(p => ({ ...p, encargadoProduccionTel: v }))} placeholder="+52 55 0000 0000" />
            <Field label="Encargado del lugar" value={plan.encargadoLugar}
              onChange={v => setPlan(p => ({ ...p, encargadoLugar: v }))} placeholder="Contacto en el venue" />
            <Field label="Teléfono del lugar" value={plan.encargadoLugarTel}
              onChange={v => setPlan(p => ({ ...p, encargadoLugarTel: v }))} placeholder="+52 55 0000 0000" />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest mb-4">LOGÍSTICA Y TRANSPORTE</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Hora de llegada al venue" required value={plan.horaLlegada}
              onChange={v => setPlan(p => ({ ...p, horaLlegada: v }))} placeholder="ej: 08:00" />
            <VehiculoSelector value={plan.vehiculo}
              onChange={v => setPlan(p => ({ ...p, vehiculo: v }))} />
            <Field label="Ruta / dirección de carga" value={plan.rutaTransporte}
              onChange={v => setPlan(p => ({ ...p, rutaTransporte: v }))} placeholder="Punto de salida y ruta hasta el venue" multiline />
            <Field label="Alimentación del crew" value={plan.alimentacion}
              onChange={v => setPlan(p => ({ ...p, alimentacion: v }))} placeholder="Quién provee, horarios, restricciones..." />
          </div>
          <div className="mt-4">
            <Field label="Hospedaje (si aplica)" value={plan.hospedaje}
              onChange={v => setPlan(p => ({ ...p, hospedaje: v }))} placeholder="Hotel, dirección, quién se queda..." />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest mb-4">CRONOGRAMA DEL DÍA</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Inicio de montaje" value={plan.montajeInicio}
              onChange={v => setPlan(p => ({ ...p, montajeInicio: v }))} placeholder="08:00" />
            <Field label="Fin de montaje / check" value={plan.montajeFin}
              onChange={v => setPlan(p => ({ ...p, montajeFin: v }))} placeholder="14:00" />
            <Field label="Soundcheck / prueba" value={plan.soundcheckHora}
              onChange={v => setPlan(p => ({ ...p, soundcheckHora: v }))} placeholder="15:00" />
          </div>
          <div className="mt-4">
            <Field label="Cronograma detallado del día" value={plan.cronogramaDia}
              onChange={v => setPlan(p => ({ ...p, cronogramaDia: v }))} placeholder="08:00 Llegada y descarga&#10;09:00 Montaje de luces&#10;12:00 Prueba de sonido&#10;..." multiline />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest mb-4">NOTAS ESPECIALES</p>
          <div className="space-y-4">
            <Field label="Equipo especial o requerimientos técnicos" value={plan.equipoEspecial}
              onChange={v => setPlan(p => ({ ...p, equipoEspecial: v }))} placeholder="Rider especial, requerimientos del artista, condiciones del venue..." multiline />
            <Field label="Proveedores externos / subcontratados" value={plan.proveedoresExternos}
              onChange={v => setPlan(p => ({ ...p, proveedoresExternos: v }))} placeholder="Iluminador externo, catering, seguridad, staff extra..." multiline />
            <Field label="Notas finales / emergencias" value={plan.notasFinales}
              onChange={v => setPlan(p => ({ ...p, notasFinales: v }))} placeholder="Contactos de emergencia, plan B, restricciones del lugar..." multiline />
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#1a1a1a]">
        <button
          onClick={() => router.push(`/proyectos/${id}`)}
          className="text-[#555] hover:text-white text-sm transition-colors"
        >
          ← Volver al proyecto
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={guardar}
            disabled={saving}
            className="bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-xl border border-[#2a2a2a] transition-all"
          >
            {saving ? "Guardando..." : "Guardar borrador"}
          </button>
          {!esAprobado && (
            <button
              onClick={aprobar}
              disabled={aprobando || !requiredOk}
              className="bg-[#B3985B] hover:bg-[#c9aa6a] disabled:opacity-40 text-black text-sm font-semibold px-6 py-2 rounded-xl transition-all"
              title={!requiredOk ? "Completa los campos requeridos primero" : ""}
            >
              {aprobando ? "Aprobando..." : "Aprobar plan de producción"}
            </button>
          )}
          {esAprobado && (
            <button
              onClick={async () => {
                await fetch(`/api/proyectos/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ planProduccionAprobado: false }),
                });
                await cargar();
                toast.success("Aprobación retirada");
              }}
              className="text-[#555] hover:text-yellow-400 text-xs transition-colors"
            >
              Retirar aprobación
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
